import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { generateChat, ChatMessage } from "@/ai/orchestrator"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { messages, sessionId } = await request.json()
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages array required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { company: true },
    })

    if (!user?.companyId) {
      return NextResponse.json({ error: "Company not found" }, { status: 400 })
    }

    // Fetch master data for context
    const clients = await prisma.customer.findMany({
      where: { companyId: user.companyId, deletedAt: null },
      select: { id: true, name: true, companyName: true, gstin: true, email: true },
    })

    const bankAccounts = await prisma.bankAccount.findMany({
      where: { companyId: user.companyId },
      select: { id: true, bankName: true, accountName: true, accountNumber: true, ifscCode: true, isDefault: true },
    })

    // Short-circuit logic for greetings
    if (messages.length > 0) {
      const lastMessageContent = messages[messages.length - 1].content.trim().toLowerCase()
      if (['hi', 'hello', 'hey'].includes(lastMessageContent)) {
        const clientName = clients.length > 0 ? (clients[0].companyName || clients[0].name) : "your client"
        const bankName = bankAccounts.length > 0 ? (bankAccounts.find(b => b.isDefault)?.bankName || bankAccounts[0].bankName) : "your bank"
        
        const cannedResponse = `Hello! I am your AI Invoice Generation Assistant. I can help you create a GST-compliant invoice through this chat.

To get started, please let me know:
1. **Client**: Are we billing our registered client, **${clientName}**?
2. **Invoice Details**: What is the description of the services/goods, quantity, rate, and GST rate (0%, 5%, 12%, 18%, or 28%)?
3. **Dates**: What are the Invoice Date and Due Date?

*(Note: We will default to your registered bank account with **${bankName}** unless specified otherwise).*`
        
        return NextResponse.json({ message: cannedResponse })
      }
    }

    // Construct system prompt
    const systemPrompt = `You are an AI Invoice Generation Assistant integrated into an ERP/Accounting platform.
Your job is to create GST-compliant invoices through a conversational interface instead of a traditional form.

The application uses a Multi-LLM AI Orchestration layer with secure provider management. You do not need to know which AI provider is responding.

Today's Date is: ${new Date().toISOString().split('T')[0]}. If the user asks for "today", use this date. If they ask for "tomorrow" or "next week", calculate accordingly from this date.

## Available Data Sources

### Client Master
${JSON.stringify(clients, null, 2)}

### Company Bank Accounts
${JSON.stringify(bankAccounts, null, 2)}

## Objective
Help the user create an invoice through natural conversation.
Collect all required invoice information, validate data, preview the invoice, and generate a structured invoice payload.

## Required Invoice Fields
- Client Information: Client Selection from Client Master (clientId)
- Company Information: Bank Account Selection from Company Bank Accounts (bankAccountId)
- Invoice Details: Invoice Date, Due Date, Description, Quantity, Rate, GST Percentage
- Optional: HSN/SAC Code, Theme Color, Notes

## Conversational Behavior
- Smart Information Extraction: Automatically extract and populate fields from user's natural language.
- Missing Information Collection: Only ask for fields that are missing.
- Client Selection Logic: If multiple matches, ask user to select. If no match, inform the user they need to create a new client first (we only support existing clients for now).
- Bank Account Selection Logic: Present available bank accounts and ask to select one.

## Validation Rules
- Due Date cannot be earlier than Invoice Date.
- GST must be a valid percentage (0, 5, 12, 18, 28).
- Quantity > 0, Rate > 0, Amount > 0.
- Client and Bank Account MUST exist in the provided JSON lists.

## Invoice Calculation Rules
Subtotal = Quantity × Rate
GST Amount = Subtotal × (GST % / 100)
Total Amount = Subtotal + GST Amount

## Invoice Preview
Before generation show:
Invoice Summary
Client: [Name]
Invoice Date: [Date]
Due Date: [Date]
Description: [Desc]
HSN/SAC: [Code]
Quantity: [Qty]
Rate: ₹[Rate]
GST: [GST]%
GST Amount: ₹[Amount]
Total Amount: ₹[Total]
Bank Account: [Bank Name] [Account]
Theme Color: [Color]

Ask: Would you like to generate this invoice?

## Invoice Generation Output
When the user confirms, generate structured JSON exactly like this, wrapping it in \`\`\`json ... \`\`\` tags:
\`\`\`json
{
  "clientId": "client-id-from-master",
  "bankAccountId": "bank-account-id-from-master",
  "invoiceDate": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD",
  "description": "string",
  "hsnSac": "string",
  "quantity": 1,
  "rate": 50000,
  "gstPercent": 18,
  "subtotal": 50000,
  "gstAmount": 9000,
  "totalAmount": 59000,
  "themeColor": "Blue"
}
\`\`\`

Important Rules:
- Never invent client data or bank account data. Always use the IDs provided in the master JSON above.
- Ask only for missing information.
- Keep responses concise and business-focused.`

    const fullMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages
    ]

    const response = await generateChat({
      companyId: user.companyId,
      messages: fullMessages,
    })

    return NextResponse.json({ message: response })
  } catch (error) {
    console.error("AI Chat Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    )
  }
}
