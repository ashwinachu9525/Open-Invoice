import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getWhatsAppProvider } from "@/services/whatsapp/factory"
import { triggerWorkflowsForEvent } from "@/actions/crm"
import { generateChat } from "@/ai/orchestrator"

export const dynamic = "force-dynamic"

// In-memory LRU cache for message deduplication (prevents double-processing retried webhooks)
const processedMessageIds = new Map<string, number>()
const DEDUPLICATION_TTL_MS = 10 * 60 * 1000 // 10 minutes

function isDuplicateMessage(msgId: string): boolean {
  if (!msgId) return false
  const now = Date.now()

  // Clean old entries
  if (processedMessageIds.size > 2000) {
    for (const [id, time] of processedMessageIds.entries()) {
      if (now - time > DEDUPLICATION_TTL_MS) {
        processedMessageIds.delete(id)
      }
    }
  }

  if (processedMessageIds.has(msgId)) {
    return true
  }

  processedMessageIds.set(msgId, now)
  return false
}

function normalizePhone(rawPhone: string): { clean: string; last10: string } {
  const digits = rawPhone.replace(/@c\.us$/, "").replace(/@s\.whatsapp\.net$/, "").replace(/\D/g, "")
  const last10 = digits.slice(-10)
  return { clean: digits, last10 }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "Open-Invoice OpenWA Webhook Ingestion Engine",
    timestamp: new Date().toISOString(),
  })
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => null)
    if (!rawBody) {
      return NextResponse.json({ error: "Empty or invalid JSON body" }, { status: 400 })
    }

    const { event, session, payload } = rawBody

    // Resolve company / session context
    // OpenWA/WAHA passes session name (which matches companyId) in body or query param
    const url = new URL(req.url)
    const companyIdOrName = session || url.searchParams.get("session") || req.headers.get("x-session-id")

    if (!companyIdOrName) {
      return NextResponse.json({ error: "Missing session or company identifier" }, { status: 400 })
    }

    // Find the tenant company
    const company = await prisma.company.findFirst({
      where: {
        OR: [
          { id: companyIdOrName },
          { name: companyIdOrName },
        ],
        openWaEnabled: true,
      },
      include: {
        aiSettings: true,
      },
    })

    if (!company) {
      return NextResponse.json({
        warning: `Company '${companyIdOrName}' not found or OpenWA is disabled for this tenant.`,
      }, { status: 200 })
    }

    // Optional webhook secret verification
    if (company.whatsappWebhookSecret) {
      const headerSecret = req.headers.get("x-webhook-secret") || url.searchParams.get("secret")
      if (headerSecret !== company.whatsappWebhookSecret) {
        return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 })
      }
    }

    // ─────────────────────────────────────────────────────────────
    // Handle Event: message (Inbound WhatsApp Message)
    // ─────────────────────────────────────────────────────────────
    if (event === "message" && payload) {
      const messageId = payload.id
      if (isDuplicateMessage(messageId)) {
        return NextResponse.json({ status: "ignored", reason: "duplicate_message_id" }, { status: 200 })
      }

      // Ignore outbound messages sent from our own device
      if (payload.fromMe === true) {
        return NextResponse.json({ status: "ignored", reason: "outbound_message" }, { status: 200 })
      }

      const rawFrom = payload.from || ""
      // Ignore group chats to protect CRM 1-on-1 contact integrity
      if (rawFrom.includes("@g.us")) {
        return NextResponse.json({ status: "ignored", reason: "group_chat_ignored" }, { status: 200 })
      }

      const { clean: cleanPhone, last10 } = normalizePhone(rawFrom)
      if (!cleanPhone) {
        return NextResponse.json({ error: "Invalid sender phone" }, { status: 400 })
      }

      const messageBody = (payload.body || payload.caption || "").trim()
      const notifyName = payload._data?.notifyName || payload.notifyName || null

      // Step 1: Match existing Customer
      let matchedCustomer = await prisma.customer.findFirst({
        where: {
          companyId: company.id,
          deletedAt: null,
          OR: [
            { phone: cleanPhone },
            { phone: { endsWith: last10 } },
          ],
        },
        include: {
          invoices: {
            where: { deletedAt: null, status: { not: "PAID" } },
            take: 3,
            orderBy: { date: "desc" },
          },
          quotations: {
            where: { status: "SENT" },
            take: 2,
            orderBy: { createdAt: "desc" },
          },
        },
      })

      // Step 2: Match existing CrmLead if customer not found
      let matchedLead = null
      if (!matchedCustomer) {
        matchedLead = await prisma.crmLead.findFirst({
          where: {
            companyId: company.id,
            deletedAt: null,
            OR: [
              { phone: cleanPhone },
              { phone: { endsWith: last10 } },
            ],
          },
          include: {
            activities: {
              take: 5,
              orderBy: { createdAt: "desc" },
            },
          },
        })
      }

      // Step 3: Record Interaction & Update Timeline
      let entityType: "CUSTOMER" | "LEAD" = "CUSTOMER"
      let entityId = ""
      let isNewLead = false

      if (matchedCustomer) {
        entityType = "CUSTOMER"
        entityId = matchedCustomer.id

        // Log into CustomerInteraction
        await prisma.customerInteraction.create({
          data: {
            customerId: matchedCustomer.id,
            type: "WHATSAPP",
            content: `[Inbound WhatsApp] ${messageBody || "[Media message]"}`,
          },
        })

        // Bump customer updatedAt
        await prisma.customer.update({
          where: { id: matchedCustomer.id },
          data: { updatedAt: new Date() },
        })

        // Trigger CRM Workflow for Customer
        await triggerWorkflowsForEvent("WHATSAPP_MESSAGE_RECEIVED", {
          companyId: company.id,
          entityType: "CUSTOMER",
          entityId: matchedCustomer.id,
          data: {
            phone: cleanPhone,
            body: messageBody,
            customerName: matchedCustomer.name,
            customerId: matchedCustomer.id,
          },
        })
      } else if (matchedLead) {
        entityType = "LEAD"
        entityId = matchedLead.id

        // Log into Lead Activity
        await prisma.crmActivity.create({
          data: {
            companyId: company.id,
            type: "NOTE",
            title: `Inbound WhatsApp from ${matchedLead.name}`,
            description: messageBody || "[Media message]",
            status: "COMPLETED",
            leadId: matchedLead.id,
          },
        })

        // Trigger CRM Workflow for Lead
        await triggerWorkflowsForEvent("WHATSAPP_MESSAGE_RECEIVED", {
          companyId: company.id,
          entityType: "LEAD",
          entityId: matchedLead.id,
          data: {
            phone: cleanPhone,
            body: messageBody,
            leadName: matchedLead.name,
            leadId: matchedLead.id,
          },
        })
      } else {
        // Unknown sender: Auto-create CRM Lead if enabled
        if (company.whatsappAutoCreateLeads) {
          const leadName = notifyName || `WhatsApp Inquiry (${cleanPhone})`
          const newLead = await prisma.crmLead.create({
            data: {
              companyId: company.id,
              name: leadName,
              phone: cleanPhone,
              source: "WHATSAPP",
              status: "NEW",
              score: 20,
              notes: `Initial WhatsApp inquiry received: "${messageBody || "[Media message]"}"`,
            },
          })

          if (newLead?.id) {
            entityType = "LEAD"
            entityId = newLead.id
            matchedLead = newLead as any
            isNewLead = true

            // Trigger LEAD_CREATED workflow
            await triggerWorkflowsForEvent("LEAD_CREATED", {
              companyId: company.id,
              entityType: "LEAD",
              entityId: newLead.id,
              data: newLead,
            })
          }
        }
      }

      // Step 4: AI Auto-Reply via Existing AI Orchestrator
      let aiReplied = false
      if (company.whatsappAiAutoReply && messageBody) {
        // Check for Human Handover suppression:
        // If the customer/lead has an interaction or tag requesting human support, skip AI reply
        const isHandoverActive =
          (matchedCustomer?.crmStatus === "VIP") ||
          (matchedLead?.notes?.includes("[HANDOVER]") ?? false)

        if (!isHandoverActive) {
          try {
            // Build rich authorized context for the AI
            let invoiceContext = ""
            if (matchedCustomer?.invoices && matchedCustomer.invoices.length > 0) {
              invoiceContext = `Open Invoices for client:\n${matchedCustomer.invoices
                .map((inv) => `- Invoice ${inv.invoiceNumber}: Amount ₹${inv.finalAmount}, Balance ₹${inv.balanceDue}, Status: ${inv.status}`)
                .join("\n")}`
            }

            let quotationContext = ""
            if (matchedCustomer?.quotations && matchedCustomer.quotations.length > 0) {
              quotationContext = `Active Quotations for client:\n${matchedCustomer.quotations
                .map((q) => `- Quote ${q.quotationNumber}: Amount ₹${q.finalAmount}, Status: ${q.status}`)
                .join("\n")}`
            }

            const senderDisplayName = matchedCustomer?.name || matchedLead?.name || notifyName || "Valued Client"

            const systemPrompt = `You are a courteous, professional AI business representative for "${company.name}".
You are assisting ${senderDisplayName} who contacted you via WhatsApp.
Keep your response concise, polite, helpful, and natural for WhatsApp (2-4 sentences maximum).
Answer questions regarding invoices, quotations, services, or business hours accurately.
${invoiceContext}
${quotationContext}

Important security rules:
- You cannot cancel invoices, issue refunds, or promise unauthorized discounts.
- If the customer asks for a human agent or has a complex custom dispute, politely inform them that a team representative will follow up shortly.`

            const aiReply = await generateChat({
              companyId: company.id,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: messageBody },
              ],
            })

            if (aiReply && aiReply.trim()) {
              const provider = await getWhatsAppProvider(company.id)
              const sendRes = await provider.sendMessage({
                chatId: rawFrom,
                message: aiReply.trim(),
                extra: { companyId: company.id },
              })

              if (sendRes.success) {
                aiReplied = true
                if (matchedCustomer) {
                  await prisma.customerInteraction.create({
                    data: {
                      customerId: matchedCustomer.id,
                      type: "WHATSAPP",
                      content: `[AI Assistant Reply] ${aiReply.trim()}`,
                    },
                  })
                }
              }
            }
          } catch (aiErr: any) {
            console.warn("[WhatsApp Webhook] AI auto-reply generation failed:", aiErr.message)
          }
        }
      }

      return NextResponse.json({
        status: "processed",
        event: "message",
        companyId: company.id,
        matched: matchedCustomer ? "CUSTOMER" : isNewLead ? "NEW_LEAD" : matchedLead ? "LEAD" : "NONE",
        entityId,
        aiReplied,
      })
    }

    // ─────────────────────────────────────────────────────────────
    // Handle Event: message.ack (Delivery & Read Statuses)
    // ─────────────────────────────────────────────────────────────
    if (event === "message.ack" && payload) {
      const { id: ackMsgId, ack } = payload
      // ack: 1 = SENT/SERVER_ACK, 2 = DELIVERED, 3 = READ
      const ackStatus = ack === 3 ? "READ" : ack === 2 ? "DELIVERED" : "SENT"

      return NextResponse.json({
        status: "ack_received",
        messageId: ackMsgId,
        ackStatus,
      })
    }

    // ─────────────────────────────────────────────────────────────
    // Handle Event: session.status
    // ─────────────────────────────────────────────────────────────
    if (event === "session.status" && payload) {
      return NextResponse.json({
        status: "session_status_received",
        sessionStatus: payload.status,
      })
    }

    return NextResponse.json({ status: "unhandled_event", event })
  } catch (error: any) {
    console.error("[WhatsApp Webhook Error]:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
