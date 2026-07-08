"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function markTourCompleted() {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Not authenticated" }
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { hasSeenTour: true },
    })
    return { success: true }
  } catch (error) {
    console.error("Failed to mark tour as completed:", error)
    return { error: "Failed to update user" }
  }
}

import { revalidatePath } from "next/cache"

export async function updateDashboardConfig(config: any) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Not authenticated" }
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { dashboardConfig: config },
    })
    revalidatePath("/dashboard")
    revalidatePath("/settings/dashboard")
    return { success: true }
  } catch (error) {
    console.error("Failed to update dashboard config:", error)
    return { error: "Failed to update user config" }
  }
}
