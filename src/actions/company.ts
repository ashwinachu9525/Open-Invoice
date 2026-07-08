"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { companySchema, CompanyFormValues } from "@/validations/company"
import { requireCompany } from "@/lib/auth-helpers"
import { createAuditLog } from "@/services/audit"
import { revalidatePath } from "next/cache"
import crypto from "crypto"
import { invalidateCompanyPdfCache } from "@/services/pdf"

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
    const companyId = user.companyId || crypto.randomUUID()
    const updateData: any = { ...parsed.data }
    
    // Fix: empty string for customDomain will cause Prisma unique constraint failure
    if (updateData.customDomain === "") {
      updateData.customDomain = null
    }

    if (!user.companyId) {
      updateData.id = companyId
    }

    if (parsed.data.razorpayKeyId) {
      if (!parsed.data.razorpayKeyId.includes(":")) {
        updateData.razorpayKeyId = encrypt(parsed.data.razorpayKeyId, companyId)
      }
    }

    if (parsed.data.razorpayKeySecret) {
      if (parsed.data.razorpayKeySecret === "••••••••") {
        updateData.razorpayKeySecret = user.company?.razorpayKeySecret || null
      } else {
        updateData.razorpayKeySecret = encrypt(parsed.data.razorpayKeySecret, companyId)
      }
    }

    if (parsed.data.razorpayWebhookSecret) {
      if (parsed.data.razorpayWebhookSecret === "••••••••") {
        updateData.razorpayWebhookSecret = user.company?.razorpayWebhookSecret || null
      } else {
        updateData.razorpayWebhookSecret = encrypt(parsed.data.razorpayWebhookSecret, companyId)
      }
    }

    if (user.companyId) {
      // Update existing company
      await prisma.company.update({
        where: { id: user.companyId },
        data: updateData
      })
    } else {
      // Generate unique slug for company
      let baseSlug = (updateData.name || 'company').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
      if (!baseSlug) baseSlug = 'company'
      let slug = baseSlug
      let counter = 1
      while (true) {
        const existing = await prisma.company.findUnique({ where: { slug } })
        if (!existing) break
        slug = `${baseSlug}-${counter}`
        counter++
      }
      
      // Create new company and link to user
      const newCompany = await prisma.company.create({
        data: {
          ...updateData,
          slug
        }
      })
      await prisma.user.update({
        where: { id: user.id },
        data: { companyId: newCompany.id }
      })
    }

    return { success: true }
  } catch (error) {
    console.error("Failed to update company:", error)
    if (error instanceof Error && (error.message.includes("Unique constraint failed") || (error as any).code === "P2002")) {
      return { error: "This custom domain is already registered by another company." }
    }
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
          companyData.razorpayKeyId = decrypt(companyData.razorpayKeyId, user.company.id)
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
export async function updateInvoiceSettings(data: { invoicePrefix?: string, invoiceTemplate?: string, removeWatermark?: boolean, autoFreezeMonths?: number | null }) {
  try {
    const { session, company } = await requireCompany()
    
    await prisma.company.update({
      where: { id: company.id },
      data: { 
        invoicePrefix: data.invoicePrefix || "INV",
        invoiceTemplate: data.invoiceTemplate,
        removeWatermark: data.removeWatermark,
        autoFreezeMonths: data.autoFreezeMonths,
      },
    })

    await createAuditLog({
      companyId: company.id,
      userId: session.user.id,
      action: "UPDATE",
      entity: "Company",
      entityId: company.id,
      details: { action: "Updated invoice settings" }
    })

    await invalidateCompanyPdfCache(company.id)

    revalidatePath("/settings")
    return { success: true }
  } catch (error) {
    console.error("Failed to update invoice settings:", error)
    return { error: "Failed to update settings" }
  }
}
export async function updateCompanyLogo(logoKey: string) {
  try {
    const { session, company } = await requireCompany()

    // Delete old logo from S3 if it exists
    if (company.logo) {
      try {
        const { deleteFile } = await import("@/services/storage")
        await deleteFile(company.logo)
      } catch (err) {
        console.warn("Failed to delete old logo from S3:", err)
      }
    }

    await prisma.company.update({
      where: { id: company.id },
      data: { logo: logoKey },
    })

    await createAuditLog({
      companyId: company.id,
      userId: session.user.id,
      action: "UPDATE",
      entity: "Company",
      entityId: company.id,
      details: { field: "logo", value: logoKey }
    })

    await invalidateCompanyPdfCache(company.id)

    revalidatePath("/settings")
    return { success: true }
  } catch (error) {
    console.error("Failed to update company logo:", error)
    return { error: "Failed to update company logo" }
  }
}

export async function removeCompanyLogo() {
  try {
    const { session, company } = await requireCompany()

    if (company.logo) {
      try {
        const { deleteFile } = await import("@/services/storage")
        await deleteFile(company.logo)
      } catch (err) {
        console.warn("Failed to delete logo from S3:", err)
      }
    }

    await prisma.company.update({
      where: { id: company.id },
      data: { logo: null },
    })

    await createAuditLog({
      companyId: company.id,
      userId: session.user.id,
      action: "UPDATE",
      entity: "Company",
      entityId: company.id,
      details: { field: "logo", value: null }
    })

    await invalidateCompanyPdfCache(company.id)

    revalidatePath("/settings")
    return { success: true }
  } catch (error) {
    console.error("Failed to remove company logo:", error)
    return { error: "Failed to remove company logo" }
  }
}
