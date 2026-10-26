import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    recurringSchedule: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}))

vi.mock("@/lib/tenant-db", () => ({
  getTenantDb: vi.fn().mockResolvedValue({
    invoice: {
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "inv_123", finalAmount: 1000 }),
      update: vi.fn().mockResolvedValue({}),
    },
    recurringSchedule: {
      update: vi.fn().mockResolvedValue({}),
    },
  }),
}))

vi.mock("@/lib/db-pool", () => ({
  withDbRetry: vi.fn((fn) => fn()),
}))

vi.mock("@/services/pdf", () => ({
  generateInvoicePdf: vi.fn().mockResolvedValue(Buffer.from("pdf")),
}))

vi.mock("@/services/smtp", () => ({
  sendInvoiceEmail: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock("@/actions/integrations", () => ({
  sendWhatsAppMessage: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock("@/services/audit", () => ({
  createAuditLog: vi.fn().mockResolvedValue({}),
}))

vi.mock("@/lib/redis", () => ({
  invalidateCachePattern: vi.fn().mockResolvedValue({}),
}))

import { GET, POST } from "../app/api/cron/recurring/route"
import { prisma } from "@/lib/prisma"

describe("Cron Recurring Invoices API Route (/api/cron/recurring)", () => {
  const originalCronSecret = process.env.CRON_SECRET

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = "test-secret-token"
  })

  it("should reject unauthorized requests when CRON_SECRET is set and no credentials provided", async () => {
    const req = new Request("http://localhost:3000/api/cron/recurring", { method: "GET" })
    const res = await GET(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe("Unauthorized")
  })

  it("should authorize requests via ?secret query parameter", async () => {
    const req = new Request("http://localhost:3000/api/cron/recurring?secret=test-secret-token", { method: "GET" })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.totalActiveSchedules).toBe(0)
  })

  it("should authorize requests via Authorization: Bearer <secret> header", async () => {
    const req = new Request("http://localhost:3000/api/cron/recurring", {
      method: "GET",
      headers: {
        authorization: "Bearer test-secret-token",
      },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it("should authorize requests via x-cron-secret header", async () => {
    const req = new Request("http://localhost:3000/api/cron/recurring", {
      method: "POST",
      headers: {
        "x-cron-secret": "test-secret-token",
      },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it("should allow request if CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET
    const req = new Request("http://localhost:3000/api/cron/recurring", { method: "GET" })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    process.env.CRON_SECRET = originalCronSecret
  })
})
