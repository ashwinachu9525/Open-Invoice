"use server"

import { prisma } from "@/lib/prisma"
import { requireCompany } from "@/lib/auth-helpers"
import { revalidatePath } from "next/cache"

export async function getWebhooks() {
  try {
    const { company } = await requireCompany()
    return await prisma.webhook.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" }
    })
  } catch (error) {
    console.error("Failed to get webhooks:", error)
    return []
  }
}

export async function createWebhook(url: string, events: string) {
  try {
    const { company } = await requireCompany()
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return { error: "URL must start with http:// or https://" }
    }
    const hook = await prisma.webhook.create({
      data: {
        companyId: company.id,
        url,
        events: events || "invoice.created,invoice.paid",
        isActive: true
      }
    })
    revalidatePath("/settings/webhooks")
    return { success: true, webhook: hook }
  } catch (error: any) {
    console.error("Failed to create webhook:", error)
    return { error: error.message || "Failed to create webhook" }
  }
}

export async function deleteWebhook(id: string) {
  try {
    const { company } = await requireCompany()
    await prisma.webhook.deleteMany({
      where: { id, companyId: company.id }
    })
    revalidatePath("/settings/webhooks")
    return { success: true }
  } catch (error: any) {
    console.error("Failed to delete webhook:", error)
    return { error: error.message || "Failed to delete webhook" }
  }
}

export async function toggleWebhook(id: string, isActive: boolean) {
  try {
    const { company } = await requireCompany()
    await prisma.webhook.updateMany({
      where: { id, companyId: company.id },
      data: { isActive }
    })
    revalidatePath("/settings/webhooks")
    return { success: true }
  } catch (error: any) {
    console.error("Failed to toggle webhook:", error)
    return { error: error.message || "Failed to toggle webhook" }
  }
}
