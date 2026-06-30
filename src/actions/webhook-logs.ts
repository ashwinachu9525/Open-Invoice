"use server"

import { prisma } from "@/lib/prisma"
import { requireCompany } from "@/lib/auth-helpers"
import { revalidatePath } from "next/cache"
import crypto from "crypto"

export async function getWebhookLogs(webhookId?: string) {
  try {
    const { company } = await requireCompany()
    
    if (webhookId) {
      return await prisma.webhookLog.findMany({
        where: {
          webhookId,
          webhook: { companyId: company.id }
        },
        orderBy: { createdAt: "desc" },
        take: 50
      })
    }

    return await prisma.webhookLog.findMany({
      where: {
        webhook: { companyId: company.id }
      },
      orderBy: { createdAt: "desc" },
      take: 50
    })
  } catch (error) {
    console.error("Failed to get webhook logs:", error)
    return []
  }
}

export async function retryWebhookLog(logId: string) {
  try {
    const { company } = await requireCompany()
    const log = await prisma.webhookLog.findFirst({
      where: {
        id: logId,
        webhook: { companyId: company.id }
      },
      include: { webhook: true }
    })

    if (!log) {
      return { error: "Log not found" }
    }

    const bodyString = log.requestBody
    const signature = crypto
      .createHmac("sha256", company.id)
      .update(bodyString)
      .digest("hex")

    let statusCode: number | null = null
    let responseBody: string | null = null
    let success = false

    try {
      const response = await fetch(log.webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-signature": signature,
          "x-webhook-event": log.event.replace(" (Retry)", ""),
        },
        body: bodyString,
      })
      statusCode = response.status
      success = response.ok
      try {
        responseBody = await response.text()
      } catch {}
    } catch (err: any) {
      responseBody = err.message || "Fetch failed"
    }

    const newLog = await prisma.webhookLog.create({
      data: {
        webhookId: log.webhookId,
        event: log.event.endsWith(" (Retry)") ? log.event : `${log.event} (Retry)`,
        url: log.webhook.url,
        statusCode,
        requestBody: bodyString,
        responseBody,
        success,
      }
    })

    revalidatePath("/settings/webhooks")
    return { success: true, log: newLog }
  } catch (error: any) {
    console.error("Failed to retry webhook:", error)
    return { error: error.message || "Failed to retry webhook" }
  }
}
