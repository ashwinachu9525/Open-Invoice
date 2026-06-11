"use server"

import { prisma } from "@/lib/prisma"
import { requireCompany } from "@/lib/auth-helpers"
import { revalidatePath } from "next/cache"
import { createAuditLog } from "@/services/audit"

export async function getDeletedItems() {
  try {
    const { company } = await requireCompany()

    const invoices = await prisma.invoice.findMany({
      where: { companyId: company.id, deletedAt: { not: null } },
      include: { customer: true },
      orderBy: { deletedAt: "desc" }
    })

    const quotations = await prisma.quotation.findMany({
      where: { companyId: company.id, deletedAt: { not: null } },
      include: { customer: true },
      orderBy: { deletedAt: "desc" }
    })

    const customers = await prisma.customer.findMany({
      where: { companyId: company.id, deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" }
    })

    return { invoices, quotations, customers }
  } catch (error) {
    console.error("Failed to fetch deleted items:", error)
    return { invoices: [], quotations: [], customers: [] }
  }
}

export async function restoreCustomer(id: string) {
  try {
    const { session, company } = await requireCompany()
    
    await prisma.customer.update({
      where: { id, companyId: company.id },
      data: { deletedAt: null },
    })

    await createAuditLog({
      companyId: company.id,
      userId: session.user.id,
      action: "UPDATE",
      entity: "Customer",
      entityId: id,
      details: { action: "restored" }
    })

    revalidatePath("/customers")
    revalidatePath("/trash")
    return { success: true }
  } catch {
    return { error: "Failed to restore customer" }
  }
}

export async function permanentlyDeleteCustomer(id: string) {
  try {
    const { session, company } = await requireCompany()
    
    await prisma.customer.delete({
      where: { id, companyId: company.id },
    })

    await createAuditLog({
      companyId: company.id,
      userId: session.user.id,
      action: "DELETE",
      entity: "Customer",
      entityId: id,
      details: { action: "permanently deleted" }
    })

    revalidatePath("/trash")
    return { success: true }
  } catch {
    return { error: "Failed to permanently delete customer" }
  }
}
