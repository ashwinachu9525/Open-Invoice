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

describe("CRM Email Open and Click Tracking with IP & Session Deduplication", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("GET /api/crm/track/open", () => {
    it("should capture IP address and record openCount = 1 on first open", async () => {
      ;(prisma.crmEmailLog.findUnique as any).mockResolvedValue({
        id: "log_123",
        campaignId: "camp_456",
        openedAt: null,
        openCount: 0,
        ipAddress: null,
        openEvents: [],
      })

      const req = new Request("http://localhost:3000/api/crm/track/open?logId=log_123", {
        headers: {
          "x-forwarded-for": "157.48.21.90",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      })
      const res = await getTrackOpen(req)

      expect(res.status).toBe(200)
      expect(res.headers.get("content-type")).toBe("image/gif")
      expect(prisma.crmEmailLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "log_123" },
          data: expect.objectContaining({
            openCount: { increment: 1 },
            ipAddress: "157.48.21.90",
            openEvents: expect.arrayContaining([
              expect.objectContaining({
                ip: "157.48.21.90",
              }),
            ]),
          }),
        })
      )
      // Campaign receives 1 unique open
      expect(prisma.crmCampaign.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "camp_456" },
          data: { openCount: { increment: 1 } },
        })
      )
    })

    it("should NOT increment openCount if the SAME IP opens again within the session window", async () => {
      const recentOpen = new Date(Date.now() - 5000) // 5 seconds ago
      ;(prisma.crmEmailLog.findUnique as any).mockResolvedValue({
        id: "log_123",
        campaignId: "camp_456",
        openedAt: recentOpen,
        openCount: 1,
        ipAddress: "157.48.21.90",
        openEvents: [
          {
            timestamp: recentOpen.toISOString(),
            ip: "157.48.21.90",
            clientType: "Chrome / Windows",
          },
        ],
      })

      const req = new Request("http://localhost:3000/api/crm/track/open?logId=log_123", {
        headers: {
          "x-forwarded-for": "157.48.21.90",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      })
      const res = await getTrackOpen(req)

      expect(res.status).toBe(200)
      // Deduplicated: identical IP within 1 hour session -> no update
      expect(prisma.crmEmailLog.update).not.toHaveBeenCalled()
      expect(prisma.crmCampaign.updateMany).not.toHaveBeenCalled()
    })

    it("should allow distinct open if a DIFFERENT IP opens the email", async () => {
      const earlierOpen = new Date(Date.now() - 60000) // 1 minute ago from office IP
      ;(prisma.crmEmailLog.findUnique as any).mockResolvedValue({
        id: "log_123",
        campaignId: "camp_456",
        openedAt: earlierOpen,
        openCount: 1,
        ipAddress: "157.48.21.90",
        openEvents: [
          {
            timestamp: earlierOpen.toISOString(),
            ip: "157.48.21.90",
          },
        ],
      })

      // Now opened from mobile IP
      const req = new Request("http://localhost:3000/api/crm/track/open?logId=log_123", {
        headers: {
          "x-forwarded-for": "49.207.18.5",
          "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        },
      })
      const res = await getTrackOpen(req)

      expect(res.status).toBe(200)
      // Increments log open count because of distinct IP session
      expect(prisma.crmEmailLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "log_123" },
          data: expect.objectContaining({
            openCount: { increment: 1 },
            ipAddress: "49.207.18.5",
          }),
        })
      )
      // But campaign unique open count is NOT incremented again for the same recipient
      expect(prisma.crmCampaign.updateMany).not.toHaveBeenCalled()
    })
  })

  describe("GET /api/crm/track/click", () => {
    it("should record click IP, redirect (302), and record clickEvent", async () => {
      ;(prisma.crmEmailLog.findUnique as any).mockResolvedValue({
        id: "log_123",
        campaignId: "camp_456",
        clickedAt: null,
        clickCount: 0,
        clickEvents: [],
      })

      const targetUrl = "https://example.com/special-offer"
      const req = new Request(
        `http://localhost:3000/api/crm/track/click?logId=log_123&target=${encodeURIComponent(targetUrl)}`,
        {
          headers: {
            "x-forwarded-for": "157.48.21.90",
            "user-agent": "Mozilla/5.0",
          },
        }
      )
      const res = await getTrackClick(req)

      expect(res.status).toBe(302)
      expect(res.headers.get("location")).toBe(targetUrl)
      expect(prisma.crmEmailLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "log_123" },
          data: expect.objectContaining({
            clickCount: { increment: 1 },
            ipAddress: "157.48.21.90",
          }),
        })
      )
    })
  })
})
