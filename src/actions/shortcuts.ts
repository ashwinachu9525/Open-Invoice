"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { UserShortcutConfig } from "@/lib/shortcuts"
import { revalidatePath } from "next/cache"

export async function updateKeyboardShortcuts(shortcuts: UserShortcutConfig) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Not authenticated" }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { dashboardConfig: true }
    })

    const currentConfig = (user?.dashboardConfig as any) || {}
    
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        dashboardConfig: {
          ...currentConfig,
          keyboardShortcuts: shortcuts
        }
      },
    })
    
    // Revalidate paths so the client layout picks up the new config
    revalidatePath("/", "layout")
    
    return { success: true }
  } catch (error) {
    console.error("Failed to update keyboard shortcuts:", error)
    return { error: "Failed to save shortcuts" }
  }
}
