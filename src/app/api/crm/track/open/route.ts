import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withDbRetry } from "@/lib/db-pool"

export const dynamic = "force-dynamic"

// 43-byte 1x1 transparent GIF buffer
const TRANSPARENT_GIF_BUFFER = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
)

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const logId = url.searchParams.get("logId") || url.searchParams.get("id")
    const campaignId = url.searchParams.get("campaignId") || url.searchParams.get("cid")

    if (logId) {
      await withDbRetry(async () => {
        const log = await prisma.crmEmailLog.findUnique({
          where: { id: logId },
          select: { id: true, campaignId: true, openedAt: true },
        })

        if (log) {
          const isFirstOpen = !log.openedAt
          await prisma.crmEmailLog.update({
            where: { id: logId },
            data: {
              openCount: { increment: 1 },
              ...(isFirstOpen && { openedAt: new Date() }),
            },
          })

          const targetCampaignId = log.campaignId || campaignId
          if (targetCampaignId) {
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
