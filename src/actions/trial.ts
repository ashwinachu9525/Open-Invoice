"use server"

import { prisma } from "@/lib/prisma"
import { requireCompany } from "@/lib/auth-helpers"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"

/**
 * Starts a 30-day Free Trial for the current company.
 * Restricts enrollment if the company has already used a trial.
 */
export async function startTrial() {
  try {
    const { company } = await requireCompany()

    // Check if company has already started a trial in the past
    if (company.trialStartsAt) {
      return { error: "You have already started a free trial in the past." }
    }

    const now = new Date()
    const trialDurationMs = 30 * 24 * 60 * 60 * 1000 // 30 days
    const trialEndsAt = new Date(now.getTime() + trialDurationMs)

    await prisma.company.update({
      where: { id: company.id },
      data: {
        trialStartsAt: now,
        trialEndsAt: trialEndsAt,
        trialReminderSent: null,
      },
    })

    revalidatePath("/settings")
    return { success: true, message: "Your 30-day free trial has started!" }
  } catch (error: any) {
    console.error("Failed to start free trial:", error)
    return { error: error.message || "An unexpected error occurred while starting your trial." }
  }
}

/**
 * Extends the trial for a specific company by a set number of days.
 * Accessible only by Super Admins.
 */
export async function extendTrial(companyId: string, days: number) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return { error: "Unauthorized. Super Admin access required." }
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    })

    if (!company) {
      return { error: "Company not found." }
    }

    const currentEndsAt = company.trialEndsAt ? new Date(company.trialEndsAt) : new Date()
    const newEndsAt = new Date(currentEndsAt.getTime() + days * 24 * 60 * 60 * 1000)

    await prisma.company.update({
      where: { id: companyId },
      data: {
        trialEndsAt: newEndsAt,
        // Reset reminder sent if extended past original end date so they get notified again
        trialReminderSent: null,
      },
    })

    revalidatePath("/admin")
    return { success: true, message: `Successfully extended trial by ${days} days.` }
  } catch (error: any) {
    console.error("Failed to extend trial:", error)
    return { error: error.message || "An unexpected error occurred while extending the trial." }
  }
}

/**
 * Returns the trial eligibility details of the current user's company.
 */
export async function getTrialEligibility() {
  try {
    const { company } = await requireCompany()
    return {
      eligible: !company.trialStartsAt,
      trialStartsAt: company.trialStartsAt,
      trialEndsAt: company.trialEndsAt,
    }
  } catch {
    return { eligible: false }
  }
}
