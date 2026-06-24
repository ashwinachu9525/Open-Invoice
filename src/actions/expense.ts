"use server"

import { requireCompany } from "@/lib/auth-helpers"
import { revalidatePath } from "next/cache"
import { getTenantDb } from "@/lib/tenant-db"

export async function getExpenses() {
  try {
    const { company } = await requireCompany()
    const prisma = await getTenantDb(company.id)
    const expenses = await prisma.expense.findMany({
      where: { companyId: company.id },
      orderBy: { date: "desc" },
    })
    return expenses
  } catch (error) {
    console.error("Failed to fetch expenses", error)
    return []
  }
}

export async function createExpense(data: {
  date: Date
  amount: number
  category: string
  description?: string
  receiptUrl?: string
}) {
  try {
    const { company } = await requireCompany()
    const prisma = await getTenantDb(company.id)
    
    await prisma.expense.create({
      data: {
        companyId: company.id,
        date: data.date,
        amount: data.amount,
        category: data.category,
        description: data.description,
        receiptUrl: data.receiptUrl,
      },
    })
    
    revalidatePath("/expenses")
    return { success: true }
  } catch (error) {
    console.error("Failed to create expense", error)
    return { error: "Failed to create expense" }
  }
}

export async function deleteExpense(id: string) {
  try {
    const { company } = await requireCompany()
    const prisma = await getTenantDb(company.id)
    
    await prisma.expense.delete({
      where: { id, companyId: company.id },
    })
    
    revalidatePath("/expenses")
    return { success: true }
  } catch (error) {
    console.error("Failed to delete expense", error)
    return { error: "Failed to delete expense" }
  }
}
