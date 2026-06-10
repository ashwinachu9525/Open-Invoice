"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { customerSchema, CustomerFormValues } from "@/validations/customer"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

async function requireUser() {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  return user
}

export async function createCustomer(data: CustomerFormValues) {
  try {
    const user = await requireUser()
    if (!user) return { error: "Unauthorized" }
    if (!user.companyId) return { error: "You must set up a company first." }

    const parsed = customerSchema.safeParse(data)
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid data" }

    await prisma.customer.create({
      data: { ...parsed.data, companyId: user.companyId },
    })
  } catch (error) {
    console.error("Failed to create customer:", error)
    return { error: "Failed to create customer" }
  }

  revalidatePath("/customers")
  redirect("/customers")
}

export async function updateCustomer(id: string, data: CustomerFormValues) {
  try {
    const user = await requireUser()
    if (!user) return { error: "Unauthorized" }
    if (!user.companyId) return { error: "No company found" }

    const parsed = customerSchema.safeParse(data)
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid data" }

    const existing = await prisma.customer.findFirst({
      where: { id, companyId: user.companyId, deletedAt: null },
    })
    if (!existing) return { error: "Customer not found" }

    await prisma.customer.update({
      where: { id },
      data: parsed.data,
    })
  } catch (error) {
    console.error("Failed to update customer:", error)
    return { error: "Failed to update customer" }
  }

  revalidatePath("/customers")
  revalidatePath(`/customers/${id}`)
  redirect("/customers")
}

export async function getCustomer(id: string) {
  try {
    const user = await requireUser()
    if (!user?.companyId) return null
    return await prisma.customer.findFirst({
      where: { id, companyId: user.companyId, deletedAt: null },
    })
  } catch {
    return null
  }
}

export async function getCustomers(params?: { search?: string; page?: number; limit?: number }) {
  try {
    const user = await requireUser()
    if (!user?.companyId) return { customers: [], total: 0, totalPages: 0 }

    const { search, page = 1, limit = 20 } = params || {}
    const skip = (page - 1) * limit

    const where = {
      companyId: user.companyId,
      deletedAt: null,
      ...(search ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { companyName: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { gstin: { contains: search, mode: "insensitive" as const } },
        ]
      } : {})
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.customer.count({ where })
    ])

    return {
      customers,
      total,
      totalPages: Math.ceil(total / limit)
    }
  } catch (error) {
    console.error("Failed to fetch customers:", error)
    return { customers: [], total: 0, totalPages: 0 }
  }
}
