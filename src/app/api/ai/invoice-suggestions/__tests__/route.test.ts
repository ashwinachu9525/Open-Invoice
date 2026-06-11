import { describe, it, expect, vi, beforeEach } from "vitest"
vi.mock("server-only", () => ({}))

vi.mock("next/server", () => {
  return {
    NextResponse: {
      json: vi.fn((data, init) => {
        return {
          status: init?.status || 200,
          json: async () => data
        }
      })
    }
  }
})

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "user_1" }
  })
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn().mockResolvedValue({
        companyId: "comp_1"
      })
    }
  }
}))

vi.mock("@/ai/orchestrator", () => ({
  generateText: vi.fn()
}))

import { POST } from "../route"
import { generateText } from "@/ai/orchestrator"

describe("POST /api/ai/invoice-suggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return a 400 if invoiceData is missing", async () => {
    const req = { json: async () => ({ instructions: "Do it" }) } as any
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("Invoice data required")
  })

  it("should return AI generated suggestions", async () => {
    const mockedGenerateText = vi.mocked(generateText)
    mockedGenerateText.mockResolvedValue(JSON.stringify({
      items: [
        { description: "Service B", quantity: 2, unitPrice: 1500, taxPercentage: 18 }
      ],
      total: 3540
    }))

    const req = { json: async () => ({ invoiceData: {}, instructions: "Change to Service B" }) } as any
    const res = await POST(req)
    
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.items).toHaveLength(1)
    expect(json.items[0].description).toBe("Service B")
  })

  it("should handle invalid JSON from AI", async () => {
    const mockedGenerateText = vi.mocked(generateText)
    mockedGenerateText.mockResolvedValue("This is not JSON at all")

    const req = { json: async () => ({ invoiceData: {}, instructions: "Do something" }) } as any
    const res = await POST(req)
    
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBe("Failed to generate suggestions")
  })
})
