"use server"

import { requireCompany } from "@/lib/auth-helpers"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getTenantDb } from "@/lib/tenant-db"

const bankAccountSchema = z.object({
  bankName: z.string().min(1, "Bank name is required"),
  accountName: z.string().min(1, "Account name is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  ifscCode: z.string().min(1, "IFSC code is required"),
  accountType: z.string().optional(),
  isDefault: z.boolean().optional().default(false),
})

export async function getBankAccounts() {
  try {
    const { company } = await requireCompany()
    const prisma = await getTenantDb(company.id)
    return await prisma.bankAccount.findMany({
      where: { companyId: company.id },
      orderBy: [
        { isDefault: "desc" },
        { createdAt: "desc" },
      ],
    })
  } catch {
    return []
  }
}

export async function createBankAccount(data: unknown) {
  try {
    const { company } = await requireCompany()
    const prisma = await getTenantDb(company.id)
    const parsed = bankAccountSchema.safeParse(data)
    
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid data" }
    }

    if (parsed.data.isDefault) {
      await prisma.bankAccount.updateMany({
        where: { companyId: company.id },
        data: { isDefault: false },
      })
    }

    const bankAccount = await prisma.bankAccount.create({
      data: {
        companyId: company.id,
        ...parsed.data,
      },
    })

    revalidatePath("/settings")
    revalidatePath("/invoices/new")
    return { success: true, bankAccount }
  } catch (error) {
    console.error("Create bank account error:", error)
    return { error: "Failed to create bank account" }
  }
}

export async function updateBankAccount(id: string, data: unknown) {
  try {
    const { company } = await requireCompany()
    const prisma = await getTenantDb(company.id)
    const parsed = bankAccountSchema.safeParse(data)
    
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid data" }
    }

    if (parsed.data.isDefault) {
      await prisma.bankAccount.updateMany({
        where: { companyId: company.id, id: { not: id } },
        data: { isDefault: false },
      })
    }

    const bankAccount = await prisma.bankAccount.update({
      where: { id, companyId: company.id },
      data: parsed.data,
    })

    revalidatePath("/settings")
    revalidatePath("/invoices/new")
    return { success: true, bankAccount }
  } catch (error) {
    console.error("Update bank account error:", error)
    return { error: "Failed to update bank account" }
  }
}

export async function deleteBankAccount(id: string) {
  try {
    const { company } = await requireCompany()
    const prisma = await getTenantDb(company.id)
    await prisma.bankAccount.delete({
      where: { id, companyId: company.id },
    })

    revalidatePath("/settings")
    revalidatePath("/invoices/new")
    return { success: true }
  } catch (error) {
    console.error("Delete bank account error:", error)
    return { error: "Failed to delete bank account" }
  }
}
