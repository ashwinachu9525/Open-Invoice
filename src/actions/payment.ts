"use server"

import { prisma } from "@/lib/prisma"
import { requireCompany } from "@/lib/auth-helpers"
import { createAuditLog } from "@/services/audit"
import { InvoiceStatus, PaymentMethod } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { z } from "zod"

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

    await prisma.$transaction(async (tx) => {
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
    return { success: true }
  } catch {
    return { error: "Failed to record payment" }
  }
}
