import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    crmEmailLog: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    crmCampaign: {
      updateMany: vi.fn(),
    },
  },
}))

vi.mock("@/lib/db-pool", () => ({
  withDbRetry: vi.fn((fn) => fn()),
}))

import { GET as getTrackOpen } from "../app/api/crm/track/open/route"
import { GET as getTrackClick } from "../app/api/crm/track/click/route"
import { prisma } from "@/lib/prisma"

describe("CRM Email Open and Click Tracking Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("GET /api/crm/track/open", () => {
    it("should return a 200 transparent GIF and increment openCount", async () => {
      ;(prisma.crmEmailLog.findUnique as any).mockResolvedValue({
        id: "log_123",
        campaignId: "camp_456",
        openedAt: null,
      })

      const req = new Request("http://localhost:3000/api/crm/track/open?logId=log_123")
      const res = await getTrackOpen(req)

      expect(res.status).toBe(200)
      expect(res.headers.get("content-type")).toBe("image/gif")
      expect(prisma.crmEmailLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "log_123" },
          data: expect.objectContaining({
            openCount: { increment: 1 },
          }),
        })
      )
      expect(prisma.crmCampaign.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "camp_456" },
          data: { openCount: { increment: 1 } },
        })
      )
    })

    it("should still return 200 GIF even if logId is missing", async () => {
      const req = new Request("http://localhost:3000/api/crm/track/open")
      const res = await getTrackOpen(req)
      expect(res.status).toBe(200)
      expect(res.headers.get("content-type")).toBe("image/gif")
    })
  })

  describe("GET /api/crm/track/click", () => {
    it("should record click and redirect (302) to target destination", async () => {
      ;(prisma.crmEmailLog.findUnique as any).mockResolvedValue({
        id: "log_123",
        campaignId: "camp_456",
        clickedAt: null,
      })

      const targetUrl = "https://example.com/special-offer"
      const req = new Request(
        `http://localhost:3000/api/crm/track/click?logId=log_123&target=${encodeURIComponent(targetUrl)}`
      )
      const res = await getTrackClick(req)

      expect(res.status).toBe(302)
      expect(res.headers.get("location")).toBe(targetUrl)
      expect(prisma.crmEmailLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "log_123" },
          data: expect.objectContaining({
            clickCount: { increment: 1 },
          }),
        })
      )
      expect(prisma.crmCampaign.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "camp_456" },
          data: { clickCount: { increment: 1 } },
        })
      )
    })

    it("should fallback to application URL if target is empty", async () => {
      ;(prisma.crmEmailLog.findUnique as any).mockResolvedValue(null)

      const req = new Request("http://localhost:3000/api/crm/track/click?logId=missing")
      const res = await getTrackClick(req)

      expect(res.status).toBe(302)
      expect(res.headers.get("location")).toBeTruthy()
    })
  })
})
