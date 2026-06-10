"use server"

import { prisma } from "@/lib/prisma"
import { requireCompany } from "@/lib/auth-helpers"
import { revalidatePath } from "next/cache"
import { RecurringFrequency, ScheduleStatus } from "@prisma/client"

export async function createOrUpdateSchedule(data: {
  invoiceId: string
  frequency: string
  nextRunAt: Date
  autoSend: boolean
}) {
  try {
    const { company } = await requireCompany()

    const invoice = await prisma.invoice.findFirst({
      where: { id: data.invoiceId, companyId: company.id }
    })

    if (!invoice) return { error: "Invoice not found" }

    const schedule = await prisma.recurringSchedule.upsert({
      where: { invoiceId: data.invoiceId },
      update: {
        frequency: data.frequency as RecurringFrequency,
        nextRunAt: data.nextRunAt,
        autoSend: data.autoSend,
        status: ScheduleStatus.ACTIVE
      },
      create: {
        invoiceId: data.invoiceId,
        frequency: data.frequency as RecurringFrequency,
        nextRunAt: data.nextRunAt,
        autoSend: data.autoSend,
        status: ScheduleStatus.ACTIVE
      }
    })

    revalidatePath(`/invoices/${data.invoiceId}`)
    return { success: true, schedule }
  } catch (error) {
    console.error("Failed to save schedule:", error)
    return { error: "Failed to save schedule" }
  }
}

export async function deleteSchedule(invoiceId: string) {
  try {
    const { company } = await requireCompany()

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, companyId: company.id }
    })

    if (!invoice) return { error: "Invoice not found" }

    await prisma.recurringSchedule.delete({
      where: { invoiceId }
    })

    revalidatePath(`/invoices/${invoiceId}`)
    revalidatePath("/invoices")
    return { success: true }
  } catch (error) {
    console.error("Failed to delete schedule:", error)
    return { error: "Failed to delete schedule" }
  }
}
