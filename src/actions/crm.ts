"use server"

import { prisma } from "@/lib/prisma"
import { getTenantDb } from "@/lib/tenant-db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

async function requireUser() {
  const session = await auth()
  if (!session?.user?.id) return null
  return await prisma.user.findUnique({ where: { id: session.user.id } })
}

export async function addInteraction(customerId: string, type: string, content: string) {
  try {
    const user = await requireUser()
    if (!user?.companyId) return { error: "Unauthorized" }

    const db = await getTenantDb(user.companyId)
    const customer = await db.customer.findFirst({
      where: { id: customerId, deletedAt: null },
    })

    if (!customer) return { error: "Customer not found" }

    const interaction = await db.customerInteraction.create({
      data: {
        customerId,
        type,
        content,
      },
    })

    revalidatePath(`/customers/${customerId}`)
    return { success: true, interaction }
  } catch (error) {
    console.error("Failed to add interaction:", error)
    return { error: "Failed to add interaction" }
  }
}

export async function getCustomerInteractions(customerId: string) {
  try {
    const user = await requireUser()
    if (!user?.companyId) return []

    const db = await getTenantDb(user.companyId)
    return await db.customerInteraction.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
    })
  } catch (error) {
    console.error("Failed to fetch customer interactions:", error)
    return []
  }
}

export async function updateCustomerCrmStatus(customerId: string, status: string) {
  try {
    const user = await requireUser()
    if (!user?.companyId) return { error: "Unauthorized" }

    const db = await getTenantDb(user.companyId)
    const customer = await db.customer.findFirst({
      where: { id: customerId, deletedAt: null },
    })

    if (!customer) return { error: "Customer not found" }

    await db.customer.update({
      where: { id: customerId },
      data: { crmStatus: status },
    })

    // Also log this status change in the interaction timeline!
    await db.customerInteraction.create({
      data: {
        customerId,
        type: "NOTE",
        content: `Customer status updated to ${status.toUpperCase()}.`,
      },
    })

    revalidatePath(`/customers/${customerId}`)
    return { success: true }
  } catch (error) {
    console.error("Failed to update CRM status:", error)
    return { error: "Failed to update CRM status" }
  }
}
