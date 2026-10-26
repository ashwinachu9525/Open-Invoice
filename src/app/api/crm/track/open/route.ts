import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withDbRetry } from "@/lib/db-pool"
import { getClientIp, parseClientDevice, isDuplicateSession } from "@/lib/tracking-utils"

export const dynamic = "force-dynamic"

// 43-byte 1x1 transparent GIF buffer
const TRANSPARENT_GIF_BUFFER = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
)

// 1-hour deduplication window per unique IP address
const IP_SESSION_WINDOW_MS = 60 * 60 * 1000

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const logId = url.searchParams.get("logId") || url.searchParams.get("id")
    const campaignId = url.searchParams.get("campaignId") || url.searchParams.get("cid")

    const clientIp = getClientIp(request)
    const userAgent = request.headers.get("user-agent") || ""
    const clientType = parseClientDevice(userAgent)
    const now = new Date()

    if (logId) {
      await withDbRetry(async () => {
        const log = await prisma.crmEmailLog.findUnique({
          where: { id: logId },
          select: {
            id: true,
            campaignId: true,
            openedAt: true,
            openCount: true,
            ipAddress: true,
            openEvents: true,
          },
        })

        if (log) {
          const isFirstOpen = !log.openedAt || log.openCount === 0
          const existingEvents: Array<{ ip: string; timestamp: string }> = Array.isArray(log.openEvents)
            ? (log.openEvents as any)
            : []

          // Session-based IP Deduplication:
          // If the same IP address pinged this email within the last 1 hour, ignore it!
          // This stops proxy pre-fetches, double-hits, and email re-renders from inflating open counts.
          if (!isFirstOpen && isDuplicateSession(existingEvents, clientIp, IP_SESSION_WINDOW_MS)) {
            return
          }

          const newEvent = {
            timestamp: now.toISOString(),
            ip: clientIp,
            clientType,
            userAgent: userAgent.slice(0, 150),
          }

          // Keep up to 50 historical open events
          const updatedEvents = [...existingEvents.slice(-49), newEvent]

          // Increment recipient's open count and save IP & audit log
          await prisma.crmEmailLog.update({
            where: { id: logId },
            data: {
              openCount: { increment: 1 },
              ...(isFirstOpen && { openedAt: now }),
              lastOpenedAt: now,
              ipAddress: clientIp,
              userAgent: userAgent.slice(0, 250),
              openEvents: updatedEvents,
            },
          })

          // On Campaign level, track UNIQUE RECIPIENT OPENS
          // Strictly increments ONCE per recipient so campaign open rate is never inflated
          const targetCampaignId = log.campaignId || campaignId
          if (targetCampaignId && isFirstOpen) {
            await prisma.crmCampaign.updateMany({
              where: { id: targetCampaignId },
              data: {
                openCount: { increment: 1 },
              },
            })
          }
        }
      })
    } else if (campaignId) {
      // Direct campaign fallback
      await withDbRetry(async () => {
        await prisma.crmCampaign.updateMany({
          where: { id: campaignId },
          data: {
            openCount: { increment: 1 },
          },
        })
      })
    }
  } catch (error) {
    console.error("CRM open tracking error:", error)
  }

  return new NextResponse(TRANSPARENT_GIF_BUFFER, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": TRANSPARENT_GIF_BUFFER.length.toString(),
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  })
}
