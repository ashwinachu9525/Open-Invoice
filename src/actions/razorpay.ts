"use server"

import Razorpay from "razorpay"
import { getTenantDb } from "@/lib/tenant-db"
import { requireCompany } from "@/lib/auth-helpers"

export async function getRazorpayClient(companyId: string) {
  const db = await getTenantDb(companyId)
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { razorpayKeyId: true, razorpayKeySecret: true }
  })

  const rawKeyId = company?.razorpayKeyId || process.env.RAZORPAY_KEY_ID
  const rawKeySecret = company?.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET

  if (!rawKeyId || !rawKeySecret) {
    return null
  }

  let keyId = rawKeyId
  let keySecret = rawKeySecret

  if (rawKeyId && rawKeyId.includes(":")) {
    try {
      const { decryptAndMigrate } = await import("@/lib/encryption")
      keyId = await decryptAndMigrate(rawKeyId, companyId, async (newCipherText) => {
        await db.company.update({
          where: { id: companyId },
          data: { razorpayKeyId: newCipherText }
        })
        console.log(`[Key Rotation] Automatically migrated razorpayKeyId for company: ${companyId}`)
      })
    } catch (err) {
      console.error("Failed to decrypt Razorpay Key ID:", err)
    }
  }

  if (rawKeySecret && rawKeySecret.includes(":")) {
    try {
      const { decryptAndMigrate } = await import("@/lib/encryption")
      keySecret = await decryptAndMigrate(rawKeySecret, companyId, async (newCipherText) => {
        await db.company.update({
          where: { id: companyId },
          data: { razorpayKeySecret: newCipherText }
        })
        console.log(`[Key Rotation] Automatically migrated razorpayKeySecret for company: ${companyId}`)
      })
    } catch (err) {
      console.error("Failed to decrypt Razorpay Key Secret:", err)
    }
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  })
}

export async function createRazorpayInvoiceLink(invoiceId: string) {
  try {
    const { company } = await requireCompany()
    const db = await getTenantDb(company.id)
    
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId, companyId: company.id },
      include: { customer: true }
    })

    if (!invoice) return { error: "Invoice not found" }

    const razorpay = await getRazorpayClient(company.id)
    if (!razorpay) {
      return { error: "Razorpay integration is not configured. Please add your credentials in company settings." }
    }

    const amountInPaisa = Math.round(invoice.finalAmount * 100)

    const paymentLink = await razorpay.paymentLink.create({
      amount: amountInPaisa,
      currency: invoice.currency || "INR",
      accept_partial: false,
      description: `Payment for Invoice ${invoice.invoiceNumber}`,
      customer: {
        name: invoice.customer.name,
        email: invoice.customer.email || undefined,
        contact: invoice.customer.phone || undefined,
      },
      notify: {
        sms: !!invoice.customer.phone,
        email: !!invoice.customer.email,
      },
      reminder_enable: true,
      notes: {
        invoiceId: invoice.id,
        companyId: company.id
      },
      callback_url: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/invoices/${invoice.id}?paid=true`,
      callback_method: "get"
    })

    await db.invoice.update({
      where: { id: invoiceId },
      data: {
        razorpayPaymentLinkId: paymentLink.id,
        razorpayPaymentLinkUrl: paymentLink.short_url
      }
    })

    const { invalidateInvoicePdfCache } = await import("@/services/pdf")
    await invalidateInvoicePdfCache(invoiceId)

    return { success: true, shortUrl: paymentLink.short_url }
  } catch (error: any) {
    console.error("Razorpay link creation error:", error)
    return { error: error.message || "Failed to create Razorpay link" }
  }
}

import { prisma } from "@/lib/prisma"
import { updateInvoiceStatus } from "@/actions/invoice"
import { InvoiceStatus } from "@prisma/client"
import { createAuditLog } from "@/services/audit"

export async function verifyAndRecordRazorpayPayment(invoiceId: string, paymentDetails: {
  razorpayPaymentId: string
  razorpaySignature?: string
  amount: number
  method: string
}) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { company: true }
    })
    
    if (!invoice) return { error: "Invoice not found" }
    
    const db = await getTenantDb(invoice.companyId)
    
    // Register the payment
    const newAmountPaid = invoice.amountPaid + paymentDetails.amount
    const balanceDue = Math.max(0, invoice.finalAmount - newAmountPaid)
    const newStatus = balanceDue <= 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID
    
    const note = `Online payment of ₹${paymentDetails.amount} recorded via Razorpay. Ref: ${paymentDetails.razorpayPaymentId}`
    
    await updateInvoiceStatus(invoiceId, newStatus, note, {
      amountPaid: paymentDetails.amount,
      balanceDue,
      tdsPercentage: 0,
      tdsAmount: 0
    })

    const firstUser = await db.user.findFirst({
      select: { id: true }
    })
    const userId = firstUser?.id || "system"

    await createAuditLog({
      companyId: invoice.companyId,
      userId,
      action: "PAYMENT",
      entity: "Invoice",
      entityId: invoiceId,
      details: { amount: paymentDetails.amount, notes: note },
    })

    return { success: true }
  } catch (error: any) {
    console.error("Verify and record payment error:", error)
    return { error: error.message || "Failed to record payment" }
  }
}

