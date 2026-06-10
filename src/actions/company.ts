"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { companySchema, CompanyFormValues } from "@/validations/company"

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

    if (user.companyId) {
      // Update existing company
      await prisma.company.update({
        where: { id: user.companyId },
        data: parsed.data
      })
    } else {
      // Create new company and link to user
      const newCompany = await prisma.company.create({
        data: parsed.data
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

    return user?.company || null
  } catch (error) {
    console.error("Failed to fetch company:", error)
    return null
  }
}
