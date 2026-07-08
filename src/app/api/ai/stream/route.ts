import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { generateChatStream, ChatMessage } from "@/ai/orchestrator"

/**
 * POST /api/ai/stream
 *
 * Streaming SSE endpoint for the AI chat.
 * Sends Server-Sent Events: `data: <chunk>\n\n`
 * Ends with: `data: [DONE]\n\n`
 *
 * Body: { messages: ChatMessage[], sessionId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const { messages, sessionId } = await request.json()
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Messages array required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { company: true },
    })
    if (!user?.companyId) {
      return new Response(JSON.stringify({ error: "Company not found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // ── Fetch context in parallel ──────────────────────────────────────────
    const [clients, bankAccounts, invoiceSummary, catalogCount] = await Promise.all([
      prisma.customer.findMany({
        where: { companyId: user.companyId, deletedAt: null },
        select: { id: true, name: true, companyName: true, gstin: true, email: true, state: true },
      }),
      prisma.bankAccount.findMany({
        where: { companyId: user.companyId },
        select: { id: true, bankName: true, accountName: true, accountNumber: true, ifscCode: true, isDefault: true },
      }),
      prisma.invoice.groupBy({
        by: ["status"],
        where: { companyId: user.companyId, deletedAt: null },
        _count: { _all: true },
        _sum: { finalAmount: true, balanceDue: true },
      }),
      prisma.productCatalog.count({
        where: { companyId: user.companyId, deletedAt: null, isActive: true },
      }),
    ])

    // ── Recent invoices for context ────────────────────────────────────────
    const recentInvoices = await prisma.invoice.findMany({
      where: { companyId: user.companyId, deletedAt: null },
      orderBy: { date: "desc" },
      take: 5,
      select: {
        invoiceNumber: true,
        status: true,
        finalAmount: true,
        balanceDue: true,
        date: true,
        dueDate: true,
        customer: { select: { name: true, companyName: true } },
      },
    })


    // ── Build business snapshot ────────────────────────────────────────────
    const overdueStat  = invoiceSummary.find(s => s.status === "OVERDUE")
    const outstandingStatuses = ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"]
    const totalOutstanding = invoiceSummary
      .filter(s => outstandingStatuses.includes(s.status))
      .reduce((sum, s) => sum + (s._sum.balanceDue ?? 0), 0)
    const totalPaidRevenue = invoiceSummary
      .find(s => s.status === "PAID")?._sum.finalAmount ?? 0
    const overdueCount  = overdueStat?._count._all ?? 0
    const overdueAmount = overdueStat?._sum.balanceDue ?? 0

    const businessSnapshot = `
## Business Snapshot (as of ${new Date().toISOString().split("T")[0]})
- Total outstanding: ₹${totalOutstanding.toLocaleString("en-IN")} across ${outstandingStatuses.length} status buckets
- Overdue invoices: ${overdueCount} worth ₹${overdueAmount.toLocaleString("en-IN")}
- Total paid revenue (all time): ₹${totalPaidRevenue.toLocaleString("en-IN")}
- Active catalog items: ${catalogCount}
- Recent invoices: ${(recentInvoices as any[]).map((i: any) => `${i.invoiceNumber} (${i.status}, ${i.customer?.name || i.customer?.companyName}, ₹${i.finalAmount})`).join("; ")}`

    // ── Short-circuit greetings ────────────────────────────────────────────
    const lastContent = messages[messages.length - 1]?.content?.trim().toLowerCase()
    if (["hi", "hello", "hey"].includes(lastContent)) {
      const clientName = clients[0]?.companyName || clients[0]?.name || "your client"
      const bankName = bankAccounts.find(b => b.isDefault)?.bankName || bankAccounts[0]?.bankName || "your bank"
      const canned = `Hello! I'm your **AI Invoice Assistant**. I can help you:\n\n- 📄 **Create multi-item invoices** conversationally\n- 📊 **Analyze your business** — revenue, overdue, top customers\n- ✉️ **Draft emails** — reminders, follow-ups, thank-yous\n- 💡 **Answer questions** about your invoices and clients\n\nTo create an invoice, just say something like:\n> *"Invoice Ravi Enterprises for web design ₹50,000 + GST 18% and hosting ₹5,000 + GST 18%"*\n\nI'll use **${clientName}** and **${bankName}** as defaults unless you specify otherwise.`
      return sseResponse(canned)
    }

    // ── System prompt ──────────────────────────────────────────────────────
    const systemPrompt = `You are an expert AI Business Assistant integrated into Open Invoice, a GST-compliant Indian invoicing platform.

Today's Date: ${new Date().toISOString().split("T")[0]}

${businessSnapshot}

## Client Master (use ONLY these IDs — never invent clients)
${JSON.stringify(clients, null, 2)}

## Company Bank Accounts
${JSON.stringify(bankAccounts, null, 2)}

## Your Capabilities
1. **Create multiple entity types** (Invoices, Expenses, Quotations, Customers, Catalog Items, Test Certificates).
2. **Answer business questions** using the snapshot above.
3. **Draft professional emails**.

## Entity Creation Rules
When the user asks you to create a specific entity, confirm the details using markdown. When the user confirms or provides enough details, output a JSON payload in \`\`\`json ... \`\`\` tags with a "type" field.

### Schemas:

**INVOICE**:
\`\`\`json
{
  "type": "INVOICE",
  "clientId": "from-master",
  "bankAccountId": "from-master",
  "invoiceDate": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD",
  "themeColor": "#1e40af",
  "notes": "Generated by AI Assistant",
  "items": [{ "description": "string", "hsnSac": "string or null", "quantity": 1, "rate": 50000, "discount": 0, "gstPercent": 18 }]
}
\`\`\`

**EXPENSE**:
\`\`\`json
{
  "type": "EXPENSE",
  "date": "YYYY-MM-DD",
  "amount": 5000,
  "category": "Travel",
  "description": "Flight tickets"
}
\`\`\`

**QUOTATION**:
\`\`\`json
{
  "type": "QUOTATION",
  "clientId": "from-master",
  "date": "YYYY-MM-DD",
  "validUntil": "YYYY-MM-DD",
  "notes": "Valid for 30 days",
  "items": [{ "description": "string", "hsnSac": "string or null", "quantity": 1, "rate": 50000, "discount": 0, "gstPercent": 18 }]
}
\`\`\`

**CUSTOMER**:
\`\`\`json
{
  "type": "CUSTOMER",
  "name": "Contact Name",
  "companyName": "Company Pvt Ltd",
  "email": "email@example.com",
  "phone": "9876543210",
  "address": "123 Street",
  "gstin": "27AADCB2230M1Z2"
}
\`\`\`

**CATALOG**:
\`\`\`json
{
  "type": "CATALOG",
  "name": "Product Name",
  "description": "Product desc",
  "price": 1000,
  "hsnSac": "9983",
  "taxRate": 18
}
\`\`\`

**CERTIFICATE**:
\`\`\`json
{
  "type": "CERTIFICATE",
  "customerId": "from-master",
  "productName": "Widget",
  "batchNumber": "B-123",
  "remarks": "Passed all tests",
  "testedParameters": [{ "parameter": "Hardness", "result": "90", "standard": "ISO 123" }]
}
\`\`\`

## Rules
- Never invent client/bank data for foreign keys.
- Be concise, professional, and proactively helpful.`

    const fullMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ]

    // ── Stream response ────────────────────────────────────────────────────
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await generateChatStream({
            companyId: user.companyId!,
            messages: fullMessages,
            onChunk(chunk) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
            },
          })
          controller.enqueue(encoder.encode("data: [DONE]\n\n"))
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Generation failed"
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`))
          controller.enqueue(encoder.encode("data: [DONE]\n\n"))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("[ai/stream] error:", error)
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

/** Return a single-shot SSE stream for a canned response */
function sseResponse(text: string): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      // Stream canned response word by word for realism
      const words = text.split(/(\s+)/)
      let i = 0
      function next() {
        if (i >= words.length) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"))
          controller.close()
          return
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(words[i])}\n\n`))
        i++
        setTimeout(next, 12)
      }
      next()
    },
  })
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  })
}
