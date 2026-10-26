import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withDbRetry } from "@/lib/db-pool"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const logId = url.searchParams.get("logId") || url.searchParams.get("id")
  const campaignId = url.searchParams.get("campaignId") || url.searchParams.get("cid")
  const targetParam = url.searchParams.get("target") || url.searchParams.get("url")

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
          select: { id: true, campaignId: true, clickedAt: true },
        })

        if (log) {
          const isFirstClick = !log.clickedAt
          await prisma.crmEmailLog.update({
            where: { id: logId },
            data: {
              clickCount: { increment: 1 },
              ...(isFirstClick && { clickedAt: new Date() }),
            },
          })

          const targetCampaignId = log.campaignId || campaignId
          if (targetCampaignId) {
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
