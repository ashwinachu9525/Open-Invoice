"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export async function requestProUpgrade() {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { company: true }
  })

  if (!user?.companyId) {
    return { success: false, error: "No company found" }
  }

  if (user.company?.subscriptionTier === "PRO") {
    return { success: false, error: "You are already on the Pro plan." }
  }

  try {
    await prisma.company.update({
      where: { id: user.companyId },
      data: {
        proRequestStatus: "PENDING"
      }
    })

    revalidatePath("/settings")
    return { success: true, message: "Upgrade request submitted successfully!" }
  } catch (error: any) {
    console.error("Error requesting pro upgrade:", error)
    return { success: false, error: "Failed to submit upgrade request." }
  }
}

export async function approveProRequest(companyId: string) {
  const session = await auth()
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await prisma.company.update({
      where: { id: companyId },
      data: {
        subscriptionTier: "PRO",
        proRequestStatus: "APPROVED"
      }
    })

    revalidatePath("/admin")
    return { success: true, message: "Pro upgrade approved successfully!" }
  } catch (error: any) {
    console.error("Error approving pro request:", error)
    return { success: false, error: "Failed to approve pro request." }
  }
}

export async function rejectProRequest(companyId: string) {
  const session = await auth()
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await prisma.company.update({
      where: { id: companyId },
      data: {
        proRequestStatus: "REJECTED"
      }
    })

    revalidatePath("/admin")
    return { success: true, message: "Pro upgrade request rejected." }
  } catch (error: any) {
    console.error("Error rejecting pro request:", error)
    return { success: false, error: "Failed to reject pro request." }
  }
}
