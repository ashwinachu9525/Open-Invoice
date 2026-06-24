"use server"

import { requireCompany } from "@/lib/auth-helpers"
import { RecurringFrequency, ScheduleStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { getTenantDb } from "@/lib/tenant-db"

export async function createRecurringSchedule(
  invoiceId: string,
  frequency: RecurringFrequency,
  autoSend = false
) {
  try {
    const { company, session } = await requireCompany()
    const prisma = await getTenantDb(company.id)
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, companyId: company.id },
    })
    if (!invoice) return { error: "Invoice not found" }

    const nextRunAt = new Date()
    nextRunAt.setMonth(nextRunAt.getMonth() + 1)

    await prisma.recurringSchedule.upsert({
      where: { invoiceId },
      create: { invoiceId, frequency, nextRunAt, autoSend },
      update: { frequency, autoSend, status: ScheduleStatus.ACTIVE },
    })

    revalidatePath(`/invoices/${invoiceId}`)

    import("@/lib/push").then(({ sendPushNotification }) => {
      sendPushNotification(session.user.id, {
        title: "Recurring Schedule Created",
        body: `Schedule activated for Invoice ${invoice.invoiceNumber}.`,
        url: `/invoices/${invoice.id}`,
      })
    })

    return { success: true }
  } catch {
    return { error: "Failed to create schedule" }
  }
}

export async function pauseRecurringSchedule(invoiceId: string) {
  try {
    const { company } = await requireCompany()
    const prisma = await getTenantDb(company.id)
    await prisma.recurringSchedule.update({
      where: { invoiceId },
      data: { status: ScheduleStatus.PAUSED },
    })
    return { success: true }
  } catch {
    return { error: "Failed to pause schedule" }
  }
}

export async function resumeRecurringSchedule(invoiceId: string) {
  try {
    const { company } = await requireCompany()
    const prisma = await getTenantDb(company.id)
    await prisma.recurringSchedule.update({
      where: { invoiceId },
      data: { status: ScheduleStatus.ACTIVE },
    })
    return { success: true }
  } catch {
    return { error: "Failed to resume schedule" }
  }
}

export async function cancelRecurringSchedule(invoiceId: string) {
  try {
    const { company } = await requireCompany()
    const prisma = await getTenantDb(company.id)
    await prisma.recurringSchedule.update({
      where: { invoiceId },
      data: { status: ScheduleStatus.CANCELLED },
    })
    return { success: true }
  } catch {
    return { error: "Failed to cancel schedule" }
  }
}
