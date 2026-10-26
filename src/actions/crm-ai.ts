"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { processCrmAiRequest, executeConfirmedCrmAction, AICrmOperationResult } from "@/ai/crm-assistant"
import { revalidatePath } from "next/cache"

export async function askCrmAiAction(userMessage: string): Promise<{ success?: boolean; data?: AICrmOperationResult; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { error: "Please sign in to access CRM AI Copilot." }
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, companyId: true }
    })

    if (!user?.companyId) {
      return { error: "No active workspace found for this account." }
    }

    const result = await processCrmAiRequest({
      companyId: user.companyId,
      userId: user.id,
      userMessage,
    })

    return { success: true, data: result }
  } catch (error: any) {
    console.error("askCrmAiAction error:", error)
    return { error: error.message || "Failed to process CRM AI query." }
  }
}

export async function confirmCrmAiActionPlan(actionPlan: {
  actionType: "PUBLISH_WORKFLOW" | "CREATE_TASK" | "CREATE_DEAL" | "CONVERT_LEAD"
  payload: any
}) {
  try {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, companyId: true }
    })
    if (!user?.companyId) return { error: "No company associated." }

    const res = await executeConfirmedCrmAction({
      companyId: user.companyId,
      userId: user.id,
      actionPlan,
    })

    revalidatePath("/crm/workflows")
    revalidatePath("/crm/activities")
    revalidatePath("/crm/deals")
    revalidatePath("/crm/dashboard")
    return res
  } catch (error: any) {
    console.error("confirmCrmAiActionPlan error:", error)
    return { error: error.message || "Execution failed." }
  }
}
