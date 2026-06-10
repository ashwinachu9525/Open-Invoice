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
        invoice: { include: { items: true, customer: true, company: true } },
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
    return { marked: overdue.count }
  }
)

export const inngestFunctions = [processRecurringInvoices, markOverdueInvoices]
