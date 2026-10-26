import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withDbRetry } from "@/lib/db-pool"

export const dynamic = "force-dynamic"

// 43-byte 1x1 transparent GIF buffer
const TRANSPARENT_GIF_BUFFER = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
)

// 10-second deduplication threshold to filter out proxy double-fetches
// (e.g. Gmail googleimageproxy, Apple Mail Privacy Protection, or antivirus scanners)
const DEBOUNCE_WINDOW_MS = 10_000

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const logId = url.searchParams.get("logId") || url.searchParams.get("id")
    const campaignId = url.searchParams.get("campaignId") || url.searchParams.get("cid")

    if (logId) {
      await withDbRetry(async () => {
        const log = await prisma.crmEmailLog.findUnique({
          where: { id: logId },
          select: {
            id: true,
            campaignId: true,
            openedAt: true,
            lastOpenedAt: true,
            openCount: true,
          },
        })

        if (log) {
          const now = new Date()
          const isFirstOpen = !log.openedAt
          const lastHit = log.lastOpenedAt || log.openedAt
          const timeSinceLastHit = lastHit ? now.getTime() - new Date(lastHit).getTime() : Infinity

          // Deduplicate: If an open request arrives within 10 seconds of a previous hit,
          // it is a duplicate proxy fetch from the same open session (e.g. Google Image Proxy).
          if (!isFirstOpen && timeSinceLastHit < DEBOUNCE_WINDOW_MS) {
            return
          }

          // Update individual recipient log
          await prisma.crmEmailLog.update({
            where: { id: logId },
            data: {
              openCount: { increment: 1 },
              ...(isFirstOpen && { openedAt: now }),
              lastOpenedAt: now,
            },
          })

          // Update Campaign: Track UNIQUE OPENS
          // Only increment campaign open count on the recipient's first open
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
