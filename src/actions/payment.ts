"use server"

import { requireCompany } from "@/lib/auth-helpers"
import { createAuditLog } from "@/services/audit"
import { InvoiceStatus, PaymentMethod } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getTenantDb } from "@/lib/tenant-db"
import { inngest } from "@/lib/inngest/client"
import { generateReceiptPdf } from "@/services/pdf"
import { sendInvoiceEmail, buildModernPaymentReceiptEmailHtml } from "@/services/smtp"

const paymentSchema = z.object({
  invoiceId: z.string(),
  amount: z.coerce.number().positive(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  transactionId: z.string().optional(),
  date: z.coerce.date().optional(),
  notes: z.string().optional(),
})

export async function recordPayment(data: unknown) {
  try {
    const { session, company } = await requireCompany()
    const prisma = await getTenantDb(company.id)
    const parsed = paymentSchema.safeParse(data)
    if (!parsed.success) return { error: "Invalid payment data" }

    const invoice = await prisma.invoice.findFirst({
      where: { id: parsed.data.invoiceId, companyId: company.id, deletedAt: null },
    })
    if (!invoice) return { error: "Invoice not found" }

    const newAmountPaid = invoice.amountPaid + parsed.data.amount
    const balanceDue = Math.max(0, invoice.finalAmount - newAmountPaid)

    let status: InvoiceStatus = invoice.status
    if (balanceDue <= 0) status = InvoiceStatus.PAID
    else if (newAmountPaid > 0) status = InvoiceStatus.PARTIALLY_PAID

    await prisma.$transaction(async (tx: any) => {
      await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: parsed.data.amount,
          paymentMethod: parsed.data.paymentMethod,
          transactionId: parsed.data.transactionId,
          date: parsed.data.date ?? new Date(),
          notes: parsed.data.notes,
        },
      })
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { amountPaid: newAmountPaid, balanceDue, status },
      })
      await tx.invoiceStatusHistory.create({
        data: {
          invoiceId: invoice.id,
          status,
          note: `Payment of ₹${parsed.data.amount} recorded`,
        },
      })
    })

    await createAuditLog({
      companyId: company.id,
      userId: session.user.id,
      action: "PAYMENT",
      entity: "Invoice",
      entityId: invoice.id,
      details: { amount: parsed.data.amount },
    })

    revalidatePath(`/invoices/${invoice.id}`)

    if (status === InvoiceStatus.PAID) {
      try {
        await inngest.send({
          name: "webhook.dispatch",
          data: {
            companyId: company.id,
            webhookEvent: "invoice.paid",
            payload: {
              id: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              finalAmount: invoice.finalAmount,
              amountPaid: newAmountPaid,
              balanceDue,
              status,
              paidAt: new Date().toISOString()
            }
          }
        })
      } catch (err) {
        console.error("Failed to trigger webhook dispatch job for invoice.paid:", err)
      }

      if (invoice.customer.email) {
        try {
          const receiptPdfBuffer = await generateReceiptPdf(invoice.id)
          const appUrl = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")
          const receiptHtml = buildModernPaymentReceiptEmailHtml({
            invoice,
            payment: {
              amount: parsed.data.amount,
              paymentDate: parsed.data.date || new Date(),
              paymentMethod: parsed.data.paymentMethod,
              referenceNumber: parsed.data.transactionId,
            },
            company,
            customer: invoice.customer,
            appUrl,
          })

          await sendInvoiceEmail({
            companyId: company.id,
            to: invoice.customer.email,
            subject: `Payment Receipt: Invoice ${invoice.invoiceNumber} [Confirmed]`,
            html: receiptHtml,
            attachments: [
              {
                filename: `Receipt-${invoice.invoiceNumber}.pdf`,
                content: receiptPdfBuffer
              }
            ]
          })
        } catch (emailErr) {
          console.error("Failed to auto-send receipt email:", emailErr)
        }
      }
    }

    import("@/lib/push").then(({ sendPushNotification }) => {
      sendPushNotification(session.user.id, {
        title: "Payment Recorded",
        body: `A payment of ₹${parsed.data.amount} was recorded for ${invoice.invoiceNumber}.`,
        url: `/invoices/${invoice.id}`,
      })
    })

    const { invalidateInvoicePdfCache } = await import("@/services/pdf")
    await invalidateInvoicePdfCache(invoice.id)

    return { success: true }
  } catch {
    return { error: "Failed to record payment" }
  }
}
