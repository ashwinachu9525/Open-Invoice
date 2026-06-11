import { inngest } from "./client"
import { prisma } from "@/lib/prisma"
import { InvoiceStatus, RecurringFrequency, ScheduleStatus } from "@prisma/client"
import { generateInvoicePdf } from "@/services/pdf"
import { sendInvoiceEmail } from "@/services/smtp"

function getNextRunDate(frequency: RecurringFrequency, from: Date): Date {
  const next = new Date(from)
  // Ensure we keep the same hour and minute that was originally configured
  // The 'from' date is the old nextRunAt, so it already has the correct hour/minute.
  switch (frequency) {
    case "WEEKLY":
      next.setDate(next.getDate() + 7)
      break
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1)
      break
    case "QUARTERLY":
      next.setMonth(next.getMonth() + 3)
      break
    case "HALF_YEARLY":
      next.setMonth(next.getMonth() + 6)
      break
    case "YEARLY":
      next.setFullYear(next.getFullYear() + 1)
      break
  }
  return next
}

export const processRecurringInvoices = inngest.createFunction(
  { id: "process-recurring-invoices", triggers: [{ cron: "0 * * * *" }] },
  async () => {
    const schedules = await prisma.recurringSchedule.findMany({
      where: {
        status: ScheduleStatus.ACTIVE,
        nextRunAt: { lte: new Date() },
      },
      include: {
        invoice: { include: { items: true, customer: true, company: { include: { users: true } } } },
      },
    })

    for (const schedule of schedules) {
      const source = schedule.invoice
      const count = await prisma.invoice.count({ where: { companyId: source.companyId } })
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`

      const newInvoice = await prisma.invoice.create({
        data: {
          companyId: source.companyId,
          customerId: source.customerId,
          invoiceNumber,
          date: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
            create: source.items.map((item) => ({
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
      }

      await prisma.recurringSchedule.update({
        where: { id: schedule.id },
        data: { nextRunAt: getNextRunDate(schedule.frequency, schedule.nextRunAt) },
      })

      // Send push notification
      import("@/lib/push").then(({ sendPushNotification }) => {
        source.company.users.forEach((u: any) => {
          sendPushNotification(u.id, {
            title: "Recurring Invoice Generated",
            body: `Invoice ${invoiceNumber} has been automatically generated.`,
            url: `/invoices/${newInvoice.id}`,
          })
        })
      })
    }

    return { processed: schedules.length }
  }
)

export const markOverdueInvoices = inngest.createFunction(
  { id: "mark-overdue-invoices", triggers: [{ cron: "0 0 * * *" }] },
  async () => {
    const overdue = await prisma.invoice.updateMany({
      where: {
        dueDate: { lt: new Date() },
        status: { in: [InvoiceStatus.SENT, InvoiceStatus.VIEWED, InvoiceStatus.PARTIALLY_PAID] },
        balanceDue: { gt: 0 },
      },
      data: { status: InvoiceStatus.OVERDUE },
    })

    // Also notify users about overdue invoices
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        dueDate: { lt: new Date() },
        status: InvoiceStatus.OVERDUE,
        balanceDue: { gt: 0 },
      },
      include: { company: { include: { users: true } } }
    })

    import("@/lib/push").then(({ sendPushNotification }) => {
      overdueInvoices.forEach(inv => {
        inv.company.users.forEach(u => {
          sendPushNotification(u.id, {
            title: "Invoice Overdue",
            body: `Invoice ${inv.invoiceNumber} is now overdue.`,
            url: `/invoices/${inv.id}`,
          })
        })
      })
    })

    return { marked: overdue.count }
  }
)

export const sendPaymentReminders = inngest.createFunction(
  { id: "send-payment-reminders", triggers: [{ cron: "0 9 * * *" }] }, // Runs daily at 9am
  async () => {
    // We only process invoices that are not paid or cancelled, and have a non-zero balance
    const eligibleInvoices = await prisma.invoice.findMany({
      where: {
        status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED, InvoiceStatus.DRAFT] },
        balanceDue: { gt: 0 },
        deletedAt: null,
      },
      include: {
        customer: true,
        company: { include: { reminderConfig: true, users: true } },
      },
    })

    const now = new Date()
    now.setHours(0, 0, 0, 0)
    let remindersSent = 0

    for (const invoice of eligibleInvoices) {
      if (!invoice.customer.email) continue
      const config = invoice.company.reminderConfig
      if (!config) continue

      const dueDate = new Date(invoice.dueDate)
      dueDate.setHours(0, 0, 0, 0)
      
      const diffTime = now.getTime() - dueDate.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      let shouldSend = false
      let messageType = ""

      if (diffDays === 0 && config.day0Enabled) {
        shouldSend = true
        messageType = "Due Today"
      } else if (diffDays === 7 && config.day7Enabled) {
        shouldSend = true
        messageType = "7 Days Overdue"
      } else if (diffDays === 15 && config.day15Enabled) {
        shouldSend = true
        messageType = "15 Days Overdue"
      }

      if (shouldSend) {
        try {
          const pdf = await generateInvoicePdf(invoice.id)
          const customMsg = config.customMessage ? `<p>${config.customMessage}</p>` : ""
          
          await sendInvoiceEmail({
            companyId: invoice.companyId,
            invoiceId: invoice.id,
            to: invoice.customer.email,
            subject: `Payment Reminder: Invoice ${invoice.invoiceNumber} is ${messageType}`,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
                <h2 style="color:#f59e0b;">Payment Reminder: ${messageType}</h2>
                <p>Hello ${invoice.customer.name},</p>
                <p>This is a friendly reminder regarding Invoice <strong>${invoice.invoiceNumber}</strong> for <strong>₹${invoice.balanceDue.toLocaleString("en-IN")}</strong>.</p>
                ${customMsg}
                <p>Please find the invoice attached to this email. We appreciate your prompt payment.</p>
              </div>
            `,
            attachments: [{ filename: `${invoice.invoiceNumber}.pdf`, content: pdf }],
          })
          remindersSent++

          import("@/lib/push").then(({ sendPushNotification }) => {
            invoice.company.users?.forEach(u => {
              sendPushNotification(u.id, {
                title: "Payment Reminder Sent",
                body: `Reminder sent to ${invoice.customer.name} for ${invoice.invoiceNumber}.`,
                url: `/invoices/${invoice.id}`,
              })
            })
          })
        } catch (e) {
          console.error(`Failed to send reminder for invoice ${invoice.id}`, e)
        }
      }
    }

    return { sent: remindersSent }
  }
)

export const inngestFunctions = [processRecurringInvoices, markOverdueInvoices, sendPaymentReminders]
