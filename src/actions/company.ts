"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { companySchema, CompanyFormValues } from "@/validations/company"
import { requireCompany } from "@/lib/auth-helpers"
import { createAuditLog } from "@/services/audit"
import { revalidatePath } from "next/cache"

export async function updateCompany(data: CompanyFormValues) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { error: "Unauthorized" }
    }

    const parsed = companySchema.safeParse(data)
    if (!parsed.success) {
      return { error: "Invalid data" }
    }

    // Check if the user already has a company
    // For this simple implementation, if companyId is set on user, update it.
    // Otherwise, create one and link it.
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { company: true }
    })

    if (!user) return { error: "User not found" }

    const { encrypt } = await import("@/lib/encryption")
    const updateData: any = { ...parsed.data }

    if (parsed.data.razorpayKeyId) {
      // Only encrypt if it is a raw key and not already encrypted
      if (!parsed.data.razorpayKeyId.includes(":")) {
        updateData.razorpayKeyId = encrypt(parsed.data.razorpayKeyId)
      }
    }

    if (parsed.data.razorpayKeySecret) {
      if (parsed.data.razorpayKeySecret === "••••••••") {
        updateData.razorpayKeySecret = user.company?.razorpayKeySecret || null
      } else {
        updateData.razorpayKeySecret = encrypt(parsed.data.razorpayKeySecret)
      }
    }

    if (parsed.data.razorpayWebhookSecret) {
      if (parsed.data.razorpayWebhookSecret === "••••••••") {
        updateData.razorpayWebhookSecret = user.company?.razorpayWebhookSecret || null
      } else {
        updateData.razorpayWebhookSecret = encrypt(parsed.data.razorpayWebhookSecret)
      }
    }

    if (user.companyId) {
      // Update existing company
      await prisma.company.update({
        where: { id: user.companyId },
        data: updateData
      })
    } else {
      // Create new company and link to user
      const newCompany = await prisma.company.create({
        data: updateData
      })
      await prisma.user.update({
        where: { id: user.id },
        data: { companyId: newCompany.id }
      })
    }

    return { success: true }
  } catch (error) {
    console.error("Failed to update company:", error)
    return { error: "Failed to update company" }
  }
}

export async function getCompany() {
  try {
    const session = await auth()
    if (!session?.user?.id) return null

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { company: true }
    })

    if (user?.company) {
      const { decrypt } = await import("@/lib/encryption")
      const companyData = { ...user.company }
      if (companyData.razorpayKeyId) {
        try {
          companyData.razorpayKeyId = decrypt(companyData.razorpayKeyId)
        } catch {
          // Skip if already in plaintext or invalid formatting
        }
      }
      if (companyData.razorpayKeySecret) {
        companyData.razorpayKeySecret = "••••••••"
      }
      if (companyData.razorpayWebhookSecret) {
        companyData.razorpayWebhookSecret = "••••••••"
      }
      return companyData
    }

    return null
  } catch (error) {
    console.error("Failed to fetch company:", error)
    return null
  }
}

export async function updateInvoicePrefix(prefix: string) {
  try {
    const { session, company } = await requireCompany()
    
    await prisma.company.update({
      where: { id: company.id },
      data: { invoicePrefix: prefix || "INV" },
    })

    await createAuditLog({
      companyId: company.id,
      userId: session.user.id,
      action: "UPDATE",
      entity: "Company",
      entityId: company.id,
      details: { field: "invoicePrefix", value: prefix }
    })

    revalidatePath("/settings")
    return { success: true }
  } catch {
    return { error: "Failed to update prefix" }
  }
}
