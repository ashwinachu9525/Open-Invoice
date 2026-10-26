"use server"

import { requireCompany } from "@/lib/auth-helpers"
import { InvoiceStatus, RecurringFrequency, ScheduleStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { getTenantDb } from "@/lib/tenant-db"
import { getCompanyNow, getNextRunDate } from "@/lib/date-utils"
import { generateInvoicePdf } from "@/services/pdf"
import { sendInvoiceEmail } from "@/services/smtp"
import { sendWhatsAppMessage } from "@/actions/integrations"
import { createAuditLog } from "@/services/audit"
import { invalidateCachePattern } from "@/lib/redis"

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

    const now = await getCompanyNow(prisma, company.baseCurrency)
    const nextRunAt = getNextRunDate(frequency, now)

    await prisma.recurringSchedule.upsert({
      where: { invoiceId },
      create: { invoiceId, frequency, nextRunAt, autoSend },
      update: { frequency, autoSend, status: ScheduleStatus.ACTIVE },
    })

    await createAuditLog({
      companyId: company.id,
      userId: session.user.id,
      action: "RECURRING_SCHEDULE_CREATE",
      entity: "RecurringSchedule",
      entityId: invoiceId,
      details: { frequency, autoSend, invoiceNumber: invoice.invoiceNumber },
      db: prisma,
    })

    revalidatePath(`/invoices/${invoiceId}`)
    revalidatePath("/invoices")

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
    const { company, session } = await requireCompany()
    const prisma = await getTenantDb(company.id)
    await prisma.recurringSchedule.update({
      where: { invoiceId },
      data: { status: ScheduleStatus.PAUSED },
    })
    await createAuditLog({
      companyId: company.id,
      userId: session.user.id,
      action: "RECURRING_SCHEDULE_PAUSE",
      entity: "RecurringSchedule",
      entityId: invoiceId,
      db: prisma,
    })
    revalidatePath(`/invoices/${invoiceId}`)
    revalidatePath("/invoices")
    return { success: true }
  } catch {
    return { error: "Failed to pause schedule" }
  }
}

export async function resumeRecurringSchedule(invoiceId: string) {
  try {
    const { company, session } = await requireCompany()
    const prisma = await getTenantDb(company.id)
    await prisma.recurringSchedule.update({
      where: { invoiceId },
      data: { status: ScheduleStatus.ACTIVE },
    })
    await createAuditLog({
      companyId: company.id,
      userId: session.user.id,
      action: "RECURRING_SCHEDULE_RESUME",
      entity: "RecurringSchedule",
      entityId: invoiceId,
      db: prisma,
    })
    revalidatePath(`/invoices/${invoiceId}`)
    revalidatePath("/invoices")
    return { success: true }
  } catch {
    return { error: "Failed to resume schedule" }
  }
}

export async function cancelRecurringSchedule(invoiceId: string) {
  try {
    const { company, session } = await requireCompany()
    const prisma = await getTenantDb(company.id)
    await prisma.recurringSchedule.update({
      where: { invoiceId },
      data: { status: ScheduleStatus.CANCELLED },
    })
    await createAuditLog({
      companyId: company.id,
      userId: session.user.id,
      action: "RECURRING_SCHEDULE_CANCEL",
      entity: "RecurringSchedule",
      entityId: invoiceId,
      db: prisma,
    })
    revalidatePath(`/invoices/${invoiceId}`)
    revalidatePath("/invoices")
    return { success: true }
  } catch {
    return { error: "Failed to cancel schedule" }
  }
}

export async function runRecurringScheduleNow(invoiceId: string) {
  try {
    const { company, session } = await requireCompany()
    const prisma = await getTenantDb(company.id)

    const schedule = await prisma.recurringSchedule.findUnique({
      where: { invoiceId },
      include: {
        invoice: { include: { items: true, customer: true, company: { include: { users: true } } } },
      },
    })

    if (!schedule || schedule.invoice.companyId !== company.id) {
      return { error: "Schedule not found or unauthorized" }
    }

    const source = schedule.invoice
    const now = await getCompanyNow(prisma, company.baseCurrency)

    const count = await prisma.invoice.count({ where: { companyId: source.companyId } })
    const prefix = company.invoicePrefix || "INV"
    let seq = count + 1
    let invoiceNumber = `${prefix}-${now.getFullYear()}-${String(seq).padStart(4, "0")}`
    while (await prisma.invoice.findFirst({ where: { companyId: source.companyId, invoiceNumber } })) {
      seq++
      invoiceNumber = `${prefix}-${now.getFullYear()}-${String(seq).padStart(4, "0")}`
    }

    let durationDays = 30
    if (source.dueDate && source.date) {
      const diff = Math.round((new Date(source.dueDate).getTime() - new Date(source.date).getTime()) / (1000 * 60 * 60 * 24))
      if (diff >= 0 && diff <= 365) durationDays = diff
    }
    const dueDate = new Date(now)
    dueDate.setDate(dueDate.getDate() + durationDays)

    const newInvoice = await prisma.invoice.create({
      data: {
        companyId: source.companyId,
        customerId: source.customerId,
        invoiceNumber,
        date: now,
        dueDate,
        currency: source.currency,
        notes: source.notes,
        terms: source.terms,
        status: InvoiceStatus.DRAFT,
        subTotal: source.subTotal,
        totalDiscount: source.totalDiscount,
        totalTax: source.totalTax,
        cgstAmount: source.cgstAmount,
        sgstAmount: source.sgstAmount,
        igstAmount: source.igstAmount,
        tdsPercentage: source.tdsPercentage,
        tdsAmount: source.tdsAmount,
        finalAmount: source.finalAmount,
        balanceDue: source.finalAmount,
        items: {
          create: source.items.map((item: any) => ({
            description: item.description,
            hsnSac: item.hsnSac,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            taxPercentage: item.taxPercentage,
            taxableAmount: item.taxableAmount,
            taxAmount: item.taxAmount,
            total: item.total,
          })),
        },
      },
    })

    if (schedule.autoSend && source.customer.email) {
      try {
        const pdf = await generateInvoicePdf(newInvoice.id)
        await sendInvoiceEmail({
          companyId: source.companyId,
          to: source.customer.email,
          subject: `Invoice ${invoiceNumber} from ${source.company.name}`,
          html: `<p>Please find attached invoice ${invoiceNumber}.</p>`,
          attachments: [{ filename: `${invoiceNumber}.pdf`, content: pdf }],
        })
        await prisma.invoice.update({
          where: { id: newInvoice.id },
          data: { status: InvoiceStatus.SENT },
        })
      } catch (err) {
        console.error("Failed to auto-send email for recurring invoice:", err)
      }

      if (source.company.openWaEnabled && source.customer.phone) {
        try {
          const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
          const waMessage = `Hi ${source.customer.name}, please find your auto-generated invoice ${invoiceNumber} for amount ₹${newInvoice.finalAmount.toLocaleString("en-IN")}. You can view and pay online here: ${appUrl}/invoices/${newInvoice.id}`
          await sendWhatsAppMessage(source.customerId, waMessage)
        } catch (e) {
          console.error("Failed to send recurring invoice WhatsApp reminder:", e)
        }
      }
    }

    let nextRun = getNextRunDate(schedule.frequency, schedule.nextRunAt)
    while (nextRun <= now) {
      nextRun = getNextRunDate(schedule.frequency, nextRun)
    }

    await prisma.recurringSchedule.update({
      where: { id: schedule.id },
      data: { nextRunAt: nextRun },
    })

    await createAuditLog({
      companyId: source.companyId,
      userId: session.user.id,
      action: "RECURRING_INVOICE_GENERATE",
      entity: "Invoice",
      entityId: newInvoice.id,
      details: {
        invoiceNumber,
        templateInvoiceId: invoiceId,
        frequency: schedule.frequency,
        trigger: "MANUAL_UI_ACTION",
      },
      db: prisma,
    })

    await invalidateCachePattern(`invoices:${company.id}:*`)
    revalidatePath(`/invoices/${invoiceId}`)
    revalidatePath("/invoices")
    revalidatePath("/dashboard")
    revalidatePath(`/invoices/${newInvoice.id}`)

    return { success: true, invoiceId: newInvoice.id, invoiceNumber }
  } catch (error: any) {
    console.error("Error executing recurring schedule:", error)
    return { error: error?.message || "Failed to run schedule" }
  }
}

export async function getCronSetupInfo() {
  try {
    const { company } = await requireCompany()
    const cronSecret = process.env.CRON_SECRET || ""
    return {
      success: true,
      hasCronSecret: Boolean(cronSecret),
      cronSecret,
      endpointPath: "/api/cron/recurring",
      companyName: company.name,
    }
  } catch (err: any) {
    return { error: err?.message || "Failed to load cron setup information" }
  }
}


