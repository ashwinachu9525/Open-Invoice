import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withDbRetry } from "@/lib/db-pool"
import { getClientIp, parseClientDevice, isDuplicateSession } from "@/lib/tracking-utils"

export const dynamic = "force-dynamic"

// 10-minute deduplication window per unique IP address for clicks
const IP_CLICK_WINDOW_MS = 10 * 60 * 1000

export async function GET(request: Request) {
  const url = new URL(request.url)
  const logId = url.searchParams.get("logId") || url.searchParams.get("id")
  const campaignId = url.searchParams.get("campaignId") || url.searchParams.get("cid")
  const targetParam = url.searchParams.get("target") || url.searchParams.get("url")

  const clientIp = getClientIp(request)
  const userAgent = request.headers.get("user-agent") || ""
  const clientType = parseClientDevice(userAgent)
  const now = new Date()

  const appUrl = (
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    url.origin ||
    "http://localhost:3000"
  ).replace(/\/$/, "")

  let destination = appUrl
  if (targetParam) {
    try {
      const decoded = decodeURIComponent(targetParam)
      if (decoded.startsWith("http://") || decoded.startsWith("https://")) {
        destination = decoded
      } else if (decoded.startsWith("/")) {
        destination = `${appUrl}${decoded}`
      }
    } catch {
      // Default to appUrl if target is malformed
    }
  }

  try {
    if (logId) {
      await withDbRetry(async () => {
        const log = await prisma.crmEmailLog.findUnique({
          where: { id: logId },
          select: {
            id: true,
            campaignId: true,
            clickedAt: true,
            clickCount: true,
            clickEvents: true,
          },
        })

        if (log) {
          const isFirstClick = !log.clickedAt || log.clickCount === 0
          const existingEvents: Array<{ ip: string; timestamp: string }> = Array.isArray(log.clickEvents)
            ? (log.clickEvents as any)
            : []

          // IP Deduplication: Skip double-clicks from the same IP within 10 minutes
          if (!isFirstClick && isDuplicateSession(existingEvents, clientIp, IP_CLICK_WINDOW_MS)) {
            return
          }

          const newEvent = {
            timestamp: now.toISOString(),
            ip: clientIp,
            clientType,
            target: destination,
            userAgent: userAgent.slice(0, 150),
          }

          const updatedEvents = [...existingEvents.slice(-49), newEvent]

          await prisma.crmEmailLog.update({
            where: { id: logId },
            data: {
              clickCount: { increment: 1 },
              ...(isFirstClick && { clickedAt: now }),
              lastClickedAt: now,
              ipAddress: clientIp,
              userAgent: userAgent.slice(0, 250),
              clickEvents: updatedEvents,
            },
          })

          // On Campaign level, track UNIQUE RECIPIENT CLICKS
          const targetCampaignId = log.campaignId || campaignId
          if (targetCampaignId && isFirstClick) {
            await prisma.crmCampaign.updateMany({
              where: { id: targetCampaignId },
              data: {
                clickCount: { increment: 1 },
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
            clickCount: { increment: 1 },
          },
        })
      })
    }
  } catch (error) {
    console.error("CRM click tracking error:", error)
  }

  return NextResponse.redirect(destination, {
    status: 302,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  })
}
