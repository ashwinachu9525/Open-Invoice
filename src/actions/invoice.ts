"use server"

import { prisma } from "@/lib/prisma"
import { getTenantDb } from "@/lib/tenant-db"
import { invoiceSchema } from "@/validations/invoice"
import { inngest } from "@/lib/inngest/client"
import { calculateInvoiceTax } from "@/services/tax-engine"
import { createAuditLog } from "@/services/audit"
import { requireCompany } from "@/lib/auth-helpers"
import { revalidatePath } from "next/cache"
import { InvoiceStatus } from "@prisma/client"
import { generateInvoicePdf } from "@/services/pdf"
import { sendInvoiceEmail } from "@/services/smtp"
import { getOrSetCache, invalidateCachePattern } from "@/lib/redis"
import { sendWhatsAppMessage, sendWhatsAppDocument } from "@/actions/integrations"

export async function createInvoice(data: unknown) {
  try {
    const { session, company } = await requireCompany(); const prisma = await getTenantDb(company.id)
    const parsed = invoiceSchema.safeParse(data)
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid data" }
    }

    const isTrialActive = company.trialEndsAt && new Date() < new Date(company.trialEndsAt)
    if (company.subscriptionTier === "FREE" && !isTrialActive) {
      const invoiceCount = await prisma.invoice.count({
        where: { companyId: company.id, deletedAt: null }
      })
      if (invoiceCount >= 5) {
        return { error: "FREE_LIMIT_REACHED" }
      }
    }

    const customer = await prisma.customer.findFirst({
      where: { id: parsed.data.customerId, companyId: company.id, deletedAt: null },
    })
    if (!customer) return { error: "Customer not found" }

    const tax = calculateInvoiceTax({
      items: parsed.data.items,
      sellerState: company.state,
      buyerState: customer.state,
      tdsPercentage: parsed.data.tdsPercentage,
      tcsRate: parsed.data.tcsRate,
    })

    const invoice = await prisma.$transaction(async (tx: any) => {
      const inv = await tx.invoice.create({
        data: {
          companyId: company.id,
          customerId: customer.id,
          invoiceNumber: parsed.data.invoiceNumber,
          date: parsed.data.date,
          dueDate: parsed.data.dueDate,
          currency: parsed.data.currency,
          exchangeRate: parsed.data.exchangeRate,
          notes: parsed.data.notes,
          terms: parsed.data.terms,
          internalNotes: parsed.data.internalNotes,
          bankName: parsed.data.bankName,
          bankAccountName: parsed.data.bankAccountName,
          bankAccountNumber: parsed.data.bankAccountNumber,
          bankIfscCode: parsed.data.bankIfscCode,
          bankAccountType: parsed.data.bankAccountType,
          themeColor: parsed.data.themeColor,
          themeFont: parsed.data.themeFont,
          status: InvoiceStatus.DRAFT,
          subTotal: tax.subTotal,
          totalDiscount: tax.totalDiscount,
          totalTax: tax.totalTax,
          cgstAmount: tax.cgstAmount,
          sgstAmount: tax.sgstAmount,
          igstAmount: tax.igstAmount,
          tdsPercentage: tax.tdsPercentage,
          tdsAmount: tax.tdsAmount,
          tcsRate: tax.tcsRate ?? 0,
          tcsAmount: tax.tcsAmount ?? 0,
          finalAmount: tax.finalAmount,
          balanceDue: tax.finalAmount,
          paymentCollectionMethod: parsed.data.paymentCollectionMethod,
          vpaAddress: parsed.data.vpaAddress,
          razorpayOrderId: parsed.data.razorpayOrderId,
          razorpayPaymentLinkId: parsed.data.razorpayPaymentLinkId,
          items: {
            create: tax.items.map((item) => ({
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
          statusHistory: {
            create: { status: InvoiceStatus.DRAFT, note: "Invoice created" },
          },
        },
        include: { items: true, customer: true },
      })
      return inv
    })

    await createAuditLog({
      companyId: company.id,
      userId: session.user.id,
      action: "CREATE",
      entity: "Invoice",
      entityId: invoice.id,
    })

    try {
      await inngest.send({
        name: "webhook.dispatch",
        data: {
          companyId: company.id,
          webhookEvent: "invoice.created",
          payload: {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            finalAmount: invoice.finalAmount,
            currency: invoice.currency,
            date: invoice.date,
            dueDate: invoice.dueDate,
            status: invoice.status,
            customerId: invoice.customerId
          }
        }
      })
    } catch (err) {
      console.error("Failed to trigger webhook dispatch job:", err)
    }

    // Invalidate invoice list cache
    await invalidateCachePattern(`invoices:${company.id}:*`)

    revalidatePath("/invoices")
    revalidatePath("/dashboard")
    return { success: true, invoiceId: invoice.id }
  } catch (error) {
    console.error("Create invoice error:", error)
    return { error: error instanceof Error ? error.message : "Failed to create invoice" }
  }
}

export async function updateInvoice(invoiceId: string, data: unknown) {
  try {
    const { session, company } = await requireCompany(); const prisma = await getTenantDb(company.id)
    
    const existing = await prisma.invoice.findFirst({
      where: { id: invoiceId, companyId: company.id, deletedAt: null }
    })
    
    if (!existing) return { error: "Invoice not found" }
    if (existing.status === "PAID") return { error: "Paid invoices cannot be edited" }

    const parsed = invoiceSchema.safeParse(data)
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid data" }
    }

    const customer = await prisma.customer.findFirst({
      where: { id: parsed.data.customerId, companyId: company.id, deletedAt: null },
    })
    if (!customer) return { error: "Customer not found" }

    const tax = calculateInvoiceTax({
      items: parsed.data.items,
      sellerState: company.state,
      buyerState: customer.state,
      tdsPercentage: parsed.data.tdsPercentage,
      tcsRate: parsed.data.tcsRate,
    })

    await prisma.$transaction(async (tx: any) => {
      // Delete old items
      await tx.invoiceItem.deleteMany({ where: { invoiceId } })
      
      // Update invoice and add new items
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          customerId: customer.id,
          invoiceNumber: parsed.data.invoiceNumber,
          date: parsed.data.date,
          dueDate: parsed.data.dueDate,
          currency: parsed.data.currency,
          exchangeRate: parsed.data.exchangeRate,
          notes: parsed.data.notes,
          terms: parsed.data.terms,
          internalNotes: parsed.data.internalNotes,
          bankName: parsed.data.bankName,
          bankAccountName: parsed.data.bankAccountName,
          bankAccountNumber: parsed.data.bankAccountNumber,
          bankIfscCode: parsed.data.bankIfscCode,
          bankAccountType: parsed.data.bankAccountType,
          themeColor: parsed.data.themeColor,
          themeFont: parsed.data.themeFont,
          subTotal: tax.subTotal,
          totalDiscount: tax.totalDiscount,
          totalTax: tax.totalTax,
          cgstAmount: tax.cgstAmount,
          sgstAmount: tax.sgstAmount,
          igstAmount: tax.igstAmount,
          tdsPercentage: tax.tdsPercentage,
          tdsAmount: tax.tdsAmount,
          tcsRate: tax.tcsRate ?? 0,
          tcsAmount: tax.tcsAmount ?? 0,
          finalAmount: tax.finalAmount,
          balanceDue: Math.max(0, tax.finalAmount - existing.amountPaid),
          status: existing.amountPaid > 0 && tax.finalAmount <= existing.amountPaid ? "PAID" : existing.status,
          paymentCollectionMethod: parsed.data.paymentCollectionMethod,
          vpaAddress: parsed.data.vpaAddress,
          razorpayOrderId: parsed.data.razorpayOrderId,
          razorpayPaymentLinkId: parsed.data.razorpayPaymentLinkId,
          items: {
            create: tax.items.map((item) => ({
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
      
      // Optional: Update status to DRAFT if it was SENT but now modified? Let's leave status as is.
    })

    await createAuditLog({
      companyId: company.id,
      userId: session.user.id,
      action: "UPDATE",
      entity: "Invoice",
      entityId: invoiceId,
    })

    // Invalidate cache
    await invalidateCachePattern(`invoice:${company.id}:${invoiceId}`)
    await invalidateCachePattern(`invoices:${company.id}:*`)

    revalidatePath(`/invoices/${invoiceId}`)
    revalidatePath("/invoices")
    revalidatePath("/dashboard")
    return { success: true }
  } catch (error) {
    console.error("Update invoice error:", error)
    return { error: error instanceof Error ? error.message : "Failed to update invoice" }
  }
}

export async function getInvoices(opts?: {
  search?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}) {
  try {
    const { company } = await requireCompany(); const prisma = await getTenantDb(company.id)
    const { search, dateFrom, dateTo, page = 1, limit = 10 } = opts ?? {}
    
    const where = {
      companyId: company.id,
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { invoiceNumber: { contains: search } },
              { customer: { name: { contains: search } } },
            ],
          }
        : {}),
      ...(dateFrom || dateTo
        ? {
            date: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
            },
          }
        : {}),
    }

    const cacheKey = `invoices:${company.id}:page:${page}:limit:${limit}:search:${search || ""}:from:${dateFrom || ""}:to:${dateTo || ""}`

    return await getOrSetCache(cacheKey, async () => {
      const [invoices, total, allForStats] = await Promise.all([
        prisma.invoice.findMany({
          where,
          include: { customer: true, schedule: true },
          orderBy: { date: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.invoice.count({ where }),
        prisma.invoice.findMany({
          where,
          select: { finalAmount: true, status: true }
        })
      ])

      const totalAmount = allForStats.reduce((sum: number, inv: any) => sum + inv.finalAmount, 0)
      const paidCount = allForStats.filter((i: any) => i.status === "PAID").length
      const pendingCount = allForStats.filter((i: any) => ["SENT", "VIEWED", "PARTIALLY_PAID"].includes(i.status)).length
      const overdueCount = allForStats.filter((i: any) => i.status === "OVERDUE").length

      return { 
        invoices, 
        totalPages: Math.ceil(total / limit), 
        totalInvoices: total,
        stats: { totalAmount, paidCount, pendingCount, overdueCount }
      }
    }, 3600)
  } catch {
    return { invoices: [], totalPages: 0, totalInvoices: 0, stats: { totalAmount: 0, paidCount: 0, pendingCount: 0, overdueCount: 0 } }
  }
}

export async function getRecentInvoices(limit = 5) {
  const { company } = await requireCompany(); const prisma = await getTenantDb(company.id)
  return prisma.invoice.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { customer: { select: { name: true } } },
  })
}

export async function sendInvoiceToClient(invoiceId: string) {
  try {
    const { session, company } = await requireCompany(); const prisma = await getTenantDb(company.id)
    
    // 1. Fetch invoice with relations
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, companyId: company.id },
      include: { customer: true, company: true }
    })
    
    if (!invoice) return { error: "Invoice not found" }
    if (!invoice.customer.email) return { error: "Customer does not have an email address" }

    // 2. Generate PDF Buffer
    const pdfBuffer = await generateInvoicePdf(invoice.id, company.id)

    // 3. Construct Email HTML
    const contactPersonName = invoice.customer.name // Using customer name as contact person name per approval
    const invoiceNumber = invoice.invoiceNumber
    const companyEmail = invoice.company.email || "No email provided"
    const companyPhone = invoice.company.phone || "No phone provided"
    const companyName = invoice.company.name

    const htmlBody = `
      <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
        <p>Hi ${contactPersonName},</p>
        <p>Please find the attached invoice <b>${invoiceNumber}</b> for your reference.</p>
        <p>If you have any questions or need any clarification regarding this invoice, please feel free to contact us using the details below.</p>
        <p>
          <b>Email:</b> ${companyEmail}<br>
          <b>Contact Number:</b> ${companyPhone}
        </p>
        <p>Thank you for your business and continued support.</p>
        <p>Best Regards,<br>${companyName}</p>
        <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888;"><b>Note:</b> This is a system-generated email. Please do not reply directly to this message.</p>
      </div>
    `

    // 4. Send Email
    await sendInvoiceEmail({
      companyId: company.id,
      invoiceId: invoiceId,
      to: invoice.customer.email,
      subject: `Invoice ${invoiceNumber}`,
      html: htmlBody,
      attachments: [{
        filename: `${invoiceNumber}.pdf`,
        content: Buffer.from(pdfBuffer)
      }]
    })

    // Send WhatsApp if enabled
    if (company.openWaEnabled && invoice.customer.phone) {
      try {
        const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
        const waMessage = `Hi ${contactPersonName}, please find your invoice ${invoiceNumber} for amount ₹${invoice.finalAmount.toLocaleString("en-IN")}. You can view and pay online here: ${appUrl}/invoices/${invoice.id}`
        await sendWhatsAppMessage(invoice.customerId, waMessage)

        // Convert the invoice PDF buffer to base64 and dispatch it as a PDF document on WhatsApp
        const base64Pdf = Buffer.from(pdfBuffer).toString("base64")
        const pdfFilename = `${invoiceNumber.replace(/\//g, "-")}.pdf`
        await sendWhatsAppDocument(
          invoice.customerId,
          base64Pdf,
          pdfFilename,
          `PDF Invoice ${invoiceNumber}`
        )
      } catch (waError) {
        console.error("Failed to send WhatsApp notification/document during invoice send:", waError)
      }
    }

    // 5. Update Status and Create Audit Log
    if (invoice.status === "DRAFT") {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "SENT" }
      })
    }

    await prisma.invoiceStatusHistory.create({
      data: {
        invoiceId: invoice.id,
        status: invoice.status === "DRAFT" ? "SENT" : invoice.status,
        note: `Invoice emailed to ${invoice.customer.email}`,
      }
    })

    await createAuditLog({
      companyId: company.id,
      userId: session.user.id,
      action: "INVOICE_SENT",
      entity: "Invoice",
      entityId: invoice.id,
      details: { message: `Invoice ${invoice.invoiceNumber} was emailed to ${invoice.customer.email}` }
    })

    revalidatePath(`/invoices/${invoice.id}`)
    revalidatePath(`/invoices`)
    revalidatePath(`/dashboard`)

    return { success: true }
  } catch (e) {
    console.error("Email send error:", e)
    return { error: e instanceof Error ? e.message : "Failed to send email" }
  }
}

export async function getInvoice(id: string) {
  try {
    const { company } = await requireCompany(); const prisma = await getTenantDb(company.id)
    return await getOrSetCache(`invoice:${company.id}:${id}`, async () => {
      return await prisma.invoice.findFirst({
        where: { id, companyId: company.id, deletedAt: null },
        include: {
          customer: true,
          items: true,
          payments: true,
          statusHistory: { orderBy: { createdAt: "desc" } },
          schedule: true,
          company: true,
        },
      })
    }, 3600) // cache for 1 hour
  } catch {
    return null
  }
}

export async function updateInvoiceStatus(
  id: string,
  status: InvoiceStatus,
  note?: string,
  paymentUpdate?: {
    amountPaid?: number
    balanceDue?: number
    tdsPercentage?: number
    tdsAmount?: number
  }
) {
  try {
    const { session, company } = await requireCompany(); const prisma = await getTenantDb(company.id)
    const invoice = await prisma.invoice.findFirst({
      where: { id, companyId: company.id, deletedAt: null },
    })
    if (!invoice) return { error: "Invoice not found" }

    const dataToUpdate: any = { status }
    if (paymentUpdate) {
      if (paymentUpdate.amountPaid !== undefined) dataToUpdate.amountPaid = paymentUpdate.amountPaid
      if (paymentUpdate.balanceDue !== undefined) dataToUpdate.balanceDue = paymentUpdate.balanceDue
      if (paymentUpdate.tdsPercentage !== undefined) dataToUpdate.tdsPercentage = paymentUpdate.tdsPercentage
      if (paymentUpdate.tdsAmount !== undefined) dataToUpdate.tdsAmount = paymentUpdate.tdsAmount
    }

    await prisma.$transaction([
      prisma.invoice.update({ where: { id }, data: dataToUpdate }),
      prisma.invoiceStatusHistory.create({
        data: { invoiceId: id, status, note },
      }),
    ])

    await createAuditLog({
      companyId: company.id,
      userId: session.user.id,
      action: "STATUS_CHANGE",
      entity: "Invoice",
      entityId: id,
      details: { status, note, ...paymentUpdate },
    })

    // Invalidate cache
    await invalidateCachePattern(`invoice:${company.id}:${id}`)
    await invalidateCachePattern(`invoices:${company.id}:*`)

    revalidatePath(`/invoices/${id}`)
    revalidatePath("/invoices")
    revalidatePath("/dashboard")
    return { success: true }
  } catch {
    return { error: "Failed to update status" }
  }
}

export async function deleteInvoice(id: string) {
  try {
    const { session, company } = await requireCompany(); const prisma = await getTenantDb(company.id)
    await prisma.invoice.update({
      where: { id, companyId: company.id },
      data: { deletedAt: new Date(), status: InvoiceStatus.CANCELLED },
    })

    await createAuditLog({
      companyId: company.id,
      userId: session.user.id,
      action: "DELETE",
      entity: "Invoice",
      entityId: id,
    })

    // Invalidate cache
    await invalidateCachePattern(`invoice:${company.id}:${id}`)
    await invalidateCachePattern(`invoices:${company.id}:*`)

    revalidatePath("/invoices")
    revalidatePath("/dashboard")
    return { success: true }
  } catch {
    return { error: "Failed to delete invoice" }
  }
}

export async function deleteInvoiceByNumber(invoiceNumber: string) {
  try {
    const { session, company } = await requireCompany(); const prisma = await getTenantDb(company.id)
    
    // First find the invoice by number
    const invoice = await prisma.invoice.findFirst({
      where: { invoiceNumber, companyId: company.id, deletedAt: null }
    })
    
    if (!invoice) return { error: "Invoice not found" }
    
    await prisma.invoice.update({
      where: { id: invoice.id, companyId: company.id },
      data: { deletedAt: new Date(), status: InvoiceStatus.CANCELLED },
    })

    await createAuditLog({
      companyId: company.id,
      userId: session.user.id,
      action: "DELETE",
      entity: "Invoice",
      entityId: invoice.id,
    })

    revalidatePath("/invoices")
    revalidatePath("/dashboard")
    return { success: true }
  } catch {
    return { error: "Failed to delete invoice" }
  }
}
export async function getNextInvoiceNumber() {
  try {
    const { company } = await requireCompany(); const prisma = await getTenantDb(company.id)
    const count = await prisma.invoice.count({ where: { companyId: company.id } })
    const year = new Date().getFullYear()
    const prefix = company.invoicePrefix || "INV"
    return `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`
  } catch {
    return `INV-${new Date().getFullYear()}-0001`
  }
}

export async function cloneInvoice(id: string) {
  try {
    const { session, company } = await requireCompany(); const prisma = await getTenantDb(company.id)
    
    const invoice = await prisma.invoice.findFirst({
      where: { id, companyId: company.id, deletedAt: null },
      include: { items: true }
    })
    
    if (!invoice) return { error: "Invoice not found" }
    
    const newInvoiceNumber = await getNextInvoiceNumber()
    
    const newInvoice = await prisma.invoice.create({
      data: {
        companyId: company.id,
        customerId: invoice.customerId,
        invoiceNumber: newInvoiceNumber,
        date: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
        currency: invoice.currency,
        exchangeRate: invoice.exchangeRate,
        notes: invoice.notes,
        terms: invoice.terms,
        internalNotes: invoice.internalNotes,
        bankName: invoice.bankName,
        bankAccountName: invoice.bankAccountName,
        bankAccountNumber: invoice.bankAccountNumber,
        bankIfscCode: invoice.bankIfscCode,
        bankAccountType: invoice.bankAccountType,
        themeColor: invoice.themeColor,
        themeFont: invoice.themeFont,
        status: InvoiceStatus.DRAFT,
        subTotal: invoice.subTotal,
        totalDiscount: invoice.totalDiscount,
        totalTax: invoice.totalTax,
        cgstAmount: invoice.cgstAmount,
        sgstAmount: invoice.sgstAmount,
        igstAmount: invoice.igstAmount,
        tdsPercentage: invoice.tdsPercentage,
        tdsAmount: invoice.tdsAmount,
        finalAmount: invoice.finalAmount,
        balanceDue: invoice.finalAmount,
        items: {
          create: invoice.items.map((item: any) => ({
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
        statusHistory: {
          create: { status: InvoiceStatus.DRAFT, note: `Cloned from ${invoice.invoiceNumber}` },
        },
      }
    })

    await createAuditLog({
      companyId: company.id,
      userId: session.user.id,
      action: "CREATE",
      entity: "Invoice",
      entityId: newInvoice.id,
      details: { clonedFrom: invoice.id }
    })

    try {
      await inngest.send({
        name: "webhook.dispatch",
        data: {
          companyId: company.id,
          webhookEvent: "invoice.created",
          payload: {
            id: newInvoice.id,
            invoiceNumber: newInvoice.invoiceNumber,
            finalAmount: newInvoice.finalAmount,
            currency: newInvoice.currency,
            date: newInvoice.date,
            dueDate: newInvoice.dueDate,
            status: newInvoice.status,
            customerId: newInvoice.customerId
          }
        }
      })
    } catch (err) {
      console.error("Failed to trigger webhook dispatch job:", err)
    }

    revalidatePath("/invoices")
    revalidatePath("/dashboard")
    return { success: true, id: newInvoice.id }
  } catch (error) {
    console.error(error)
    return { error: "Failed to clone invoice" }
  }
}

export async function bulkDeleteInvoices(ids: string[]) {
  try {
    const { session, company } = await requireCompany(); const prisma = await getTenantDb(company.id)
    
    await prisma.invoice.updateMany({
      where: { id: { in: ids }, companyId: company.id },
      data: { deletedAt: new Date(), status: InvoiceStatus.CANCELLED },
    })

    await createAuditLog({
      companyId: company.id,
      userId: session.user.id,
      action: "BULK_DELETE",
      entity: "Invoice",
      entityId: "bulk",
      details: { count: ids.length, ids },
    })

    // Invalidate caches
    for (const id of ids) {
      await invalidateCachePattern(`invoice:${company.id}:${id}`)
    }
    await invalidateCachePattern(`invoices:${company.id}:*`)

    revalidatePath("/invoices")
    revalidatePath("/dashboard")
    return { success: true }
  } catch {
    return { error: "Failed to delete invoices" }
  }
}

export async function restoreInvoice(id: string) {
  try {
    const { session, company } = await requireCompany(); const prisma = await getTenantDb(company.id)
    
    await prisma.invoice.update({
      where: { id, companyId: company.id },
      data: { deletedAt: null, status: InvoiceStatus.DRAFT },
    })

    await createAuditLog({
      companyId: company.id,
      userId: session.user.id,
      action: "UPDATE",
      entity: "Invoice",
      entityId: id,
      details: { action: "restored" }
    })

    // Invalidate cache
    await invalidateCachePattern(`invoice:${company.id}:${id}`)
    await invalidateCachePattern(`invoices:${company.id}:*`)

    revalidatePath("/invoices")
    revalidatePath("/trash")
    revalidatePath("/dashboard")
    return { success: true }
  } catch {
    return { error: "Failed to restore invoice" }
  }
}

export async function permanentlyDeleteInvoice(id: string) {
  try {
    const { session, company } = await requireCompany(); const prisma = await getTenantDb(company.id)
    
    await prisma.invoice.delete({
      where: { id, companyId: company.id },
    })

    await createAuditLog({
      companyId: company.id,
      userId: session.user.id,
      action: "DELETE",
      entity: "Invoice",
      entityId: id,
      details: { action: "permanently deleted" }
    })

    revalidatePath("/trash")
    return { success: true }
  } catch {
    return { error: "Failed to permanently delete invoice" }
  }
}

export async function sendInvoiceViaWhatsApp(invoiceId: string) {
  try {
    const { session, company } = await requireCompany()
    const prisma = await getTenantDb(company.id)

    // 1. Fetch invoice with relations
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, companyId: company.id },
      include: { customer: true, company: true }
    })

    if (!invoice) return { error: "Invoice not found" }
    if (!company.openWaEnabled) {
      return { error: "WhatsApp integration is disabled. Please enable it in Settings." }
    }
    if (!invoice.customer.phone) {
      return { error: "Customer does not have a phone number configured." }
    }

    // 2. Generate PDF Buffer
    const pdfBuffer = await generateInvoicePdf(invoice.id, company.id)

    // 3. Construct WhatsApp Message text
    const contactPersonName = invoice.customer.name
    const invoiceNumber = invoice.invoiceNumber
    const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const waMessage = `Hi ${contactPersonName}, please find your invoice ${invoiceNumber} for amount ₹${invoice.finalAmount.toLocaleString("en-IN")}. You can view and pay online here: ${appUrl}/invoices/${invoice.id}`

    // 4. Send text message
    await sendWhatsAppMessage(invoice.customerId, waMessage)

    // 5. Send PDF document
    const base64Pdf = Buffer.from(pdfBuffer).toString("base64")
    const pdfFilename = `${invoiceNumber.replace(/\//g, "-")}.pdf`
    const docResult = await sendWhatsAppDocument(
      invoice.customerId,
      base64Pdf,
      pdfFilename,
      `PDF Invoice ${invoiceNumber}`
    )

    if (docResult.error) {
      return { error: docResult.error }
    }

    // 6. Update Status
    if (invoice.status === "DRAFT") {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "SENT" }
      })
    }

    await prisma.invoiceStatusHistory.create({
      data: {
        invoiceId: invoice.id,
        status: invoice.status === "DRAFT" ? "SENT" : invoice.status,
        note: `Invoice sent via WhatsApp (OpenWA)`,
      }
    })

    await createAuditLog({
      companyId: company.id,
      userId: session.user.id,
      action: "UPDATE",
      entity: "Invoice",
      entityId: invoice.id,
      details: { action: "sent via WhatsApp (OpenWA)" }
    })

    revalidatePath(`/invoices/${invoice.id}`)
    revalidatePath("/invoices")
    return { success: true }
  } catch (error: any) {
    console.error("Failed to send WhatsApp manually:", error)
    return { error: error.message || "Failed to send WhatsApp" }
  }
}

