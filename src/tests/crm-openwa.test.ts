import { describe, it, expect, vi, beforeEach } from "vitest"

// Hoisted mocks for use inside vi.mock factories
const { mockSendMessage, mockSendDocument, mockTriggerWorkflowsForEvent } = vi.hoisted(() => ({
  mockSendMessage: vi.fn().mockResolvedValue({ success: true, messageId: "msg_sent_1" }),
  mockSendDocument: vi.fn().mockResolvedValue({ success: true, messageId: "doc_sent_1" }),
  mockTriggerWorkflowsForEvent: vi.fn().mockResolvedValue([]),
}))

// Mock server-only
vi.mock("server-only", () => ({}))

// Mock Auth
vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "user_test", role: "ADMIN" },
  }),
}))

// Mock CRM actions directly
vi.mock("@/actions/crm", () => ({
  triggerWorkflowsForEvent: mockTriggerWorkflowsForEvent,
}))

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    company: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    customer: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    customerInteraction: {
      create: vi.fn().mockResolvedValue({ id: "ci_1" }),
    },
    crmLead: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn().mockResolvedValue({ id: "lead_default_1", name: "Lead 1" }),
      update: vi.fn(),
    },
    crmActivity: {
      create: vi.fn().mockResolvedValue({ id: "act_1" }),
    },
    crmWorkflow: {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
    },
    crmWorkflowLog: {
      create: vi.fn().mockResolvedValue({ id: "log_1" }),
    },
    invoice: {
      findUnique: vi.fn(),
    },
    payment: {
      create: vi.fn(),
    },
  },
}))

// Mock WhatsApp Provider Factory
vi.mock("@/services/whatsapp/factory", () => ({
  getWhatsAppProvider: vi.fn().mockResolvedValue({
    sendMessage: mockSendMessage,
    sendDocument: mockSendDocument,
  }),
}))

// Mock AI Orchestrator
vi.mock("@/ai/orchestrator", () => ({
  generateChat: vi.fn().mockResolvedValue("Hello! We received your inquiry and our team is reviewing your invoice."),
}))

import { prisma } from "@/lib/prisma"
import { POST } from "@/app/api/webhooks/whatsapp/route"
import { generateChat } from "@/ai/orchestrator"
import {
  APPROVED_TRIGGERS,
  APPROVED_ACTIONS,
  validateAndNormalizeWorkflow,
} from "@/lib/crm-workflow-schema"

describe("OpenWA Integration with CRM Lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─────────────────────────────────────────────────────────────
  // 1. Workflow Schema Tests
  // ─────────────────────────────────────────────────────────────
  describe("Workflow Schema & Action Registration", () => {
    it("should register WHATSAPP_MESSAGE_RECEIVED as an approved trigger", () => {
      const trigger = APPROVED_TRIGGERS.find((t) => t.id === "WHATSAPP_MESSAGE_RECEIVED")
      expect(trigger).toBeDefined()
      expect(trigger?.entity).toBe("CUSTOMER")
      expect(trigger?.label).toContain("WhatsApp")
    })

    it("should register SEND_WHATSAPP and AI_REPLY_WHATSAPP as approved actions", () => {
      const sendAction = APPROVED_ACTIONS.find((a) => a.id === "SEND_WHATSAPP")
      expect(sendAction).toBeDefined()
      expect(sendAction?.requiresConfirmation).toBe(false)

      const aiReplyAction = APPROVED_ACTIONS.find((a) => a.id === "AI_REPLY_WHATSAPP")
      expect(aiReplyAction).toBeDefined()
      expect(aiReplyAction?.requiresConfirmation).toBe(false)
    })

    it("should validate and normalize a WhatsApp workflow safely", () => {
      const rawWorkflow = {
        name: "Auto Inbound WhatsApp Response",
        description: "Sends automated reply when WhatsApp message arrives",
        trigger: {
          type: "WHATSAPP_MESSAGE_RECEIVED",
          label: "WhatsApp Message Received",
        },
        conditions: [],
        actions: [
          {
            actionType: "SEND_WHATSAPP" as const,
            label: "Send Initial Greeting",
            config: { message: "Thank you for reaching out! We are here to help." },
            requiresConfirmation: false,
          },
          {
            actionType: "AI_REPLY_WHATSAPP" as const,
            label: "Generate AI Reply",
            config: {},
            requiresConfirmation: false,
          },
        ],
      }

      const normalized = validateAndNormalizeWorkflow(rawWorkflow)
      expect(normalized.name).toBe("Auto Inbound WhatsApp Response")
      expect(normalized.trigger.type).toBe("WHATSAPP_MESSAGE_RECEIVED")
      expect(normalized.actions.length).toBe(2)
      expect(normalized.actions[0].actionType).toBe("SEND_WHATSAPP")
      expect(normalized.actions[1].actionType).toBe("AI_REPLY_WHATSAPP")
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 2. Webhook Ingestion & Idempotency Tests
  // ─────────────────────────────────────────────────────────────
  describe("Webhook Ingestion Engine (POST /api/webhooks/whatsapp)", () => {
    const mockCompany = {
      id: "comp_123",
      name: "Acme Enterprises",
      openWaEnabled: true,
      whatsappAiAutoReply: true,
      whatsappAutoCreateLeads: true,
      whatsappWebhookSecret: null,
    }

    it("should reject requests without a session or company identifier", async () => {
      const req = {
        json: async () => ({ event: "message", payload: { id: "msg_1" } }),
        url: "http://localhost:3000/api/webhooks/whatsapp",
        headers: new Headers(),
      } as any

      const res = await POST(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe("Missing session or company identifier")
    })

    it("should enforce webhook secret verification when configured", async () => {
      vi.mocked(prisma.company.findFirst).mockResolvedValueOnce({
        ...mockCompany,
        whatsappWebhookSecret: "secret_token_abc",
      } as any)

      const req = {
        json: async () => ({
          event: "message",
          session: "comp_123",
          payload: { id: "msg_unauth", body: "Hello" },
        }),
        url: "http://localhost:3000/api/webhooks/whatsapp",
        headers: new Headers({ "x-webhook-secret": "wrong_token" }),
      } as any

      const res = await POST(req)
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe("Invalid webhook secret")
    })

    it("should ignore duplicate messages based on message ID (idempotency)", async () => {
      vi.mocked(prisma.company.findFirst).mockResolvedValue({
        ...mockCompany,
      } as any)

      const uniqueMsgId = `dup_test_${Date.now()}`
      const reqPayload = {
        event: "message",
        session: "comp_123",
        payload: {
          id: uniqueMsgId,
          from: "919876543210@c.us",
          body: "Checking invoice",
        },
      }

      const req1 = {
        json: async () => reqPayload,
        url: "http://localhost:3000/api/webhooks/whatsapp",
        headers: new Headers(),
      } as any

      // First delivery: processes
      await POST(req1)

      // Duplicate delivery: should be ignored
      const req2 = {
        json: async () => reqPayload,
        url: "http://localhost:3000/api/webhooks/whatsapp",
        headers: new Headers(),
      } as any

      const res2 = await POST(req2)
      expect(res2.status).toBe(200)
      const data2 = await res2.json()
      expect(data2.status).toBe("ignored")
      expect(data2.reason).toBe("duplicate_message_id")
    })

    it("should ignore outbound messages sent from the business device (fromMe: true)", async () => {
      vi.mocked(prisma.company.findFirst).mockResolvedValueOnce(mockCompany as any)

      const req = {
        json: async () => ({
          event: "message",
          session: "comp_123",
          payload: {
            id: `msg_out_${Date.now()}`,
            fromMe: true,
            from: "919876543210@c.us",
            body: "Here is your invoice",
          },
        }),
        url: "http://localhost:3000/api/webhooks/whatsapp",
        headers: new Headers(),
      } as any

      const res = await POST(req)
      const data = await res.json()
      expect(data.status).toBe("ignored")
      expect(data.reason).toBe("outbound_message")
    })

    it("should ignore group chat messages to maintain 1-on-1 CRM integrity", async () => {
      vi.mocked(prisma.company.findFirst).mockResolvedValueOnce(mockCompany as any)

      const req = {
        json: async () => ({
          event: "message",
          session: "comp_123",
          payload: {
            id: `msg_group_${Date.now()}`,
            from: "1234567890-1614556@g.us",
            body: "Group broadcast message",
          },
        }),
        url: "http://localhost:3000/api/webhooks/whatsapp",
        headers: new Headers(),
      } as any

      const res = await POST(req)
      const data = await res.json()
      expect(data.status).toBe("ignored")
      expect(data.reason).toBe("group_chat_ignored")
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 3. Contact Matching & Lifecycle Integration Tests
  // ─────────────────────────────────────────────────────────────
  describe("Contact Matching & CRM Lifecycle", () => {
    const mockCompany = {
      id: "comp_123",
      name: "Acme Enterprises",
      openWaEnabled: true,
      whatsappAiAutoReply: true,
      whatsappAutoCreateLeads: true,
      whatsappWebhookSecret: null,
    }

    it("should match existing customer, log CustomerInteraction, and trigger WHATSAPP_MESSAGE_RECEIVED", async () => {
      vi.mocked(prisma.company.findFirst).mockResolvedValueOnce(mockCompany as any)

      const mockCustomer = {
        id: "cust_777",
        name: "Rahul Sharma",
        phone: "9876543210",
        invoices: [{ invoiceNumber: "INV-001", finalAmount: 5000, balanceDue: 2000, status: "UNPAID" }],
        quotations: [],
      }
      vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce(mockCustomer as any)

      const req = {
        json: async () => ({
          event: "message",
          session: "comp_123",
          payload: {
            id: `msg_cust_${Date.now()}`,
            from: "919876543210@c.us",
            body: "Can you send my pending balance?",
          },
        }),
        url: "http://localhost:3000/api/webhooks/whatsapp",
        headers: new Headers(),
      } as any

      const res = await POST(req)
      const data = await res.json()

      expect(data.status).toBe("processed")
      expect(data.matched).toBe("CUSTOMER")
      expect(data.entityId).toBe("cust_777")

      // Verify CustomerInteraction was created
      expect(prisma.customerInteraction.create).toHaveBeenCalledWith({
        data: {
          customerId: "cust_777",
          type: "WHATSAPP",
          content: "[Inbound WhatsApp] Can you send my pending balance?",
        },
      })

      // Verify customer updatedAt was updated
      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: "cust_777" },
        data: { updatedAt: expect.any(Date) },
      })

      // Verify triggerWorkflowsForEvent was invoked
      expect(mockTriggerWorkflowsForEvent).toHaveBeenCalledWith(
        "WHATSAPP_MESSAGE_RECEIVED",
        expect.objectContaining({
          companyId: "comp_123",
          entityType: "CUSTOMER",
          entityId: "cust_777",
        })
      )
    })

    it("should match existing CRM Lead when customer not found, log activity, and trigger workflow", async () => {
      vi.mocked(prisma.company.findFirst).mockResolvedValueOnce(mockCompany as any)
      vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce(null)

      const mockLead = {
        id: "lead_888",
        name: "Pooja Patel",
        phone: "9876543211",
        notes: "Interested in consulting package",
      }
      vi.mocked(prisma.crmLead.findFirst).mockResolvedValueOnce(mockLead as any)

      const req = {
        json: async () => ({
          event: "message",
          session: "comp_123",
          payload: {
            id: `msg_lead_${Date.now()}`,
            from: "919876543211@c.us",
            body: "I would like to schedule a call.",
          },
        }),
        url: "http://localhost:3000/api/webhooks/whatsapp",
        headers: new Headers(),
      } as any

      const res = await POST(req)
      const data = await res.json()

      expect(data.status).toBe("processed")
      expect(data.matched).toBe("LEAD")
      expect(data.entityId).toBe("lead_888")

      // Verify CRM Activity was logged on the lead
      expect(prisma.crmActivity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          leadId: "lead_888",
          type: "NOTE",
          title: "Inbound WhatsApp from Pooja Patel",
        }),
      })

      // Verify workflow trigger for LEAD
      expect(mockTriggerWorkflowsForEvent).toHaveBeenCalledWith(
        "WHATSAPP_MESSAGE_RECEIVED",
        expect.objectContaining({
          companyId: "comp_123",
          entityType: "LEAD",
          entityId: "lead_888",
        })
      )
    })

    it("should automatically create a new CRM Lead for unknown senders and trigger LEAD_CREATED", async () => {
      vi.mocked(prisma.company.findFirst).mockResolvedValueOnce(mockCompany as any)
      vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce(null)
      vi.mocked(prisma.crmLead.findFirst).mockResolvedValueOnce(null)

      const createdLead = {
        id: "lead_auto_999",
        name: "Vikram Tech",
        phone: "919812345678",
        source: "WHATSAPP",
        status: "NEW",
        score: 20,
      }
      vi.mocked(prisma.crmLead.create).mockResolvedValueOnce(createdLead as any)

      const req = {
        json: async () => ({
          event: "message",
          session: "comp_123",
          payload: {
            id: `msg_unknown_${Date.now()}`,
            from: "919812345678@c.us",
            notifyName: "Vikram Tech",
            body: "Hi, do you offer GST filing services?",
          },
        }),
        url: "http://localhost:3000/api/webhooks/whatsapp",
        headers: new Headers(),
      } as any

      const res = await POST(req)
      const data = await res.json()

      expect(data.status).toBe("processed")
      expect(data.matched).toBe("NEW_LEAD")
      expect(data.entityId).toBe("lead_auto_999")

      // Verify lead creation with phone and source
      expect(prisma.crmLead.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: "comp_123",
          name: "Vikram Tech",
          phone: "919812345678",
          source: "WHATSAPP",
          status: "NEW",
        }),
      })

      // Verify LEAD_CREATED workflow trigger
      expect(mockTriggerWorkflowsForEvent).toHaveBeenCalledWith(
        "LEAD_CREATED",
        expect.objectContaining({
          companyId: "comp_123",
          entityType: "LEAD",
          entityId: "lead_auto_999",
        })
      )
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 4. AI Orchestration & Human Handover Tests
  // ─────────────────────────────────────────────────────────────
  describe("AI Orchestration & Human Handover Suppression", () => {
    const mockCompany = {
      id: "comp_123",
      name: "Acme Enterprises",
      openWaEnabled: true,
      whatsappAiAutoReply: true,
      whatsappAutoCreateLeads: false,
      whatsappWebhookSecret: null,
    }

    it("should invoke existing generateChat orchestrator and send WhatsApp reply when AI auto-reply is enabled", async () => {
      vi.mocked(prisma.company.findFirst).mockResolvedValueOnce(mockCompany as any)
      vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce({
        id: "cust_101",
        name: "Arjun Verma",
        phone: "9876543200",
        invoices: [{ invoiceNumber: "INV-100", finalAmount: 12000, balanceDue: 0, status: "PAID" }],
        quotations: [],
      } as any)

      vi.mocked(generateChat).mockResolvedValueOnce("Hi Arjun, Invoice INV-100 is fully paid. Thank you!")

      const req = {
        json: async () => ({
          event: "message",
          session: "comp_123",
          payload: {
            id: `msg_ai_${Date.now()}`,
            from: "919876543200@c.us",
            body: "Is my payment cleared for INV-100?",
          },
        }),
        url: "http://localhost:3000/api/webhooks/whatsapp",
        headers: new Headers(),
      } as any

      const res = await POST(req)
      const data = await res.json()

      expect(data.aiReplied).toBe(true)
      expect(generateChat).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: "comp_123",
          messages: expect.arrayContaining([
            expect.objectContaining({ role: "system" }),
            expect.objectContaining({ role: "user", content: "Is my payment cleared for INV-100?" }),
          ]),
        })
      )
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          chatId: "919876543200@c.us",
          message: "Hi Arjun, Invoice INV-100 is fully paid. Thank you!",
        })
      )
    })

    it("should suppress AI auto-reply if customer has VIP status or lead has [HANDOVER] note", async () => {
      vi.mocked(prisma.company.findFirst).mockResolvedValueOnce(mockCompany as any)

      // Customer tagged as VIP (Human agent takeover)
      vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce({
        id: "cust_vip",
        name: "Important Client",
        phone: "9876543299",
        crmStatus: "VIP",
      } as any)

      const req = {
        json: async () => ({
          event: "message",
          session: "comp_123",
          payload: {
            id: `msg_handover_${Date.now()}`,
            from: "919876543299@c.us",
            body: "I need to speak with the manager directly.",
          },
        }),
        url: "http://localhost:3000/api/webhooks/whatsapp",
        headers: new Headers(),
      } as any

      const res = await POST(req)
      const data = await res.json()

      // Should process the inbound message but skip AI auto-reply
      expect(data.status).toBe("processed")
      expect(data.aiReplied).toBe(false)
      expect(generateChat).not.toHaveBeenCalled()
      expect(mockSendMessage).not.toHaveBeenCalled()
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 5. Message ACK & Session Status Events
  // ─────────────────────────────────────────────────────────────
  describe("Delivery Status (ACK) & Session Lifecycle Events", () => {
    const mockCompany = {
      id: "comp_123",
      name: "Acme Enterprises",
      openWaEnabled: true,
      whatsappWebhookSecret: null,
    }

    it("should process message.ack event and map acknowledgment status", async () => {
      vi.mocked(prisma.company.findFirst).mockResolvedValueOnce(mockCompany as any)

      const req = {
        json: async () => ({
          event: "message.ack",
          session: "comp_123",
          payload: {
            id: "msg_ack_123",
            ack: 3, // READ
          },
        }),
        url: "http://localhost:3000/api/webhooks/whatsapp",
        headers: new Headers(),
      } as any

      const res = await POST(req)
      const data = await res.json()

      expect(data.status).toBe("ack_received")
      expect(data.messageId).toBe("msg_ack_123")
      expect(data.ackStatus).toBe("READ")
    })

    it("should process session.status events", async () => {
      vi.mocked(prisma.company.findFirst).mockResolvedValueOnce(mockCompany as any)

      const req = {
        json: async () => ({
          event: "session.status",
          session: "comp_123",
          payload: {
            status: "WORKING",
          },
        }),
        url: "http://localhost:3000/api/webhooks/whatsapp",
        headers: new Headers(),
      } as any

      const res = await POST(req)
      const data = await res.json()

      expect(data.status).toBe("session_status_received")
      expect(data.sessionStatus).toBe("WORKING")
    })

    it("should return ok from GET health check", async () => {
      const { GET } = await import("@/app/api/webhooks/whatsapp/route")
      const res = await GET()
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.status).toBe("ok")
      expect(data.service).toContain("OpenWA Webhook")
    })

    it("should return a warning when company is not found or has openWa disabled", async () => {
      vi.mocked(prisma.company.findFirst).mockResolvedValueOnce(null)

      const req = {
        json: async () => ({
          event: "message",
          session: "unknown_session",
          payload: { id: "msg_none", body: "Hello" },
        }),
        url: "http://localhost:3000/api/webhooks/whatsapp",
        headers: new Headers(),
      } as any

      const res = await POST(req)
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data.warning).toContain("not found or OpenWA is disabled")
    })
  })
})
