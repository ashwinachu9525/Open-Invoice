"use server"

import { prisma } from "@/lib/prisma"
import { invoiceSchema } from "@/validations/invoice"
import { calculateInvoiceTax } from "@/services/tax-engine"
import { createAuditLog } from "@/services/audit"
import { requireCompany } from "@/lib/auth-helpers"
import { revalidatePath } from "next/cache"
import { InvoiceStatus } from "@prisma/client"
import { generateInvoicePdf } from "@/services/pdf"
import { sendInvoiceEmail } from "@/services/smtp"

export async function createInvoice(data: unknown) {
  try {
    const { session, company } = await requireCompany()
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
    })

    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          companyId: company.id,
          customerId: customer.id,
          invoiceNumber: parsed.data.invoiceNumber,
          date: parsed.data.date,
          dueDate: parsed.data.dueDate,
          currency: parsed.data.currency,
          notes: parsed.data.notes,
          terms: parsed.data.terms,
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
          finalAmount: tax.finalAmount,
          balanceDue: tax.finalAmount,
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
    const { session, company } = await requireCompany()
    
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
    })

    await prisma.$transaction(async (tx) => {
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
          notes: parsed.data.notes,
          terms: parsed.data.terms,
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
          finalAmount: tax.finalAmount,
          balanceDue: tax.finalAmount - existing.amountPaid, // Keep existing paid amount in mind
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
    const { company } = await requireCompany()
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

    const totalAmount = allForStats.reduce((sum, inv) => sum + inv.finalAmount, 0)
    const paidCount = allForStats.filter((i) => i.status === "PAID").length
    const pendingCount = allForStats.filter((i) => ["SENT", "VIEWED", "PARTIALLY_PAID"].includes(i.status)).length
    const overdueCount = allForStats.filter((i) => i.status === "OVERDUE").length

    return { 
      invoices, 
      totalPages: Math.ceil(total / limit), 
      totalInvoices: total,
      stats: { totalAmount, paidCount, pendingCount, overdueCount }
    }
  } catch {
    return { invoices: [], totalPages: 0, totalInvoices: 0, stats: { totalAmount: 0, paidCount: 0, pendingCount: 0, overdueCount: 0 } }
  }
}

export async function getRecentInvoices(limit = 5) {
  const { company } = await requireCompany()
  return prisma.invoice.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { customer: { select: { name: true } } },
  })
}

export async function sendInvoiceToClient(invoiceId: string) {
  try {
    const { session, company } = await requireCompany()
    
    // 1. Fetch invoice with relations
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, companyId: company.id },
      include: { customer: true, company: true }
    })
    
    if (!invoice) return { error: "Invoice not found" }
    if (!invoice.customer.email) return { error: "Customer does not have an email address" }

    // 2. Generate PDF Buffer
    const pdfBuffer = await generateInvoicePdf(invoice.id)

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
      to: invoice.customer.email,
      subject: `Invoice ${invoiceNumber}`,
      html: htmlBody,
      attachments: [{
        filename: `${invoiceNumber}.pdf`,
        content: Buffer.from(pdfBuffer)
      }]
    })

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
    const { company } = await requireCompany()
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
  } catch {
    return null
  }
}

export async function updateInvoiceStatus(
  id: string,
  status: InvoiceStatus,
  note?: string
) {
  try {
    const { session, company } = await requireCompany()
    const invoice = await prisma.invoice.findFirst({
      where: { id, companyId: company.id, deletedAt: null },
    })
    if (!invoice) return { error: "Invoice not found" }

    await prisma.$transaction([
      prisma.invoice.update({ where: { id }, data: { status } }),
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
      details: { status, note },
    })

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
    const { session, company } = await requireCompany()
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

    revalidatePath("/invoices")
    revalidatePath("/dashboard")
    return { success: true }
  } catch {
    return { error: "Failed to delete invoice" }
  }
}

export async function deleteInvoiceByNumber(invoiceNumber: string) {
  try {
    const { session, company } = await requireCompany()
    
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
    const { company } = await requireCompany()
    const count = await prisma.invoice.count({ where: { companyId: company.id } })
    const year = new Date().getFullYear()
    return `INV-${year}-${String(count + 1).padStart(4, "0")}`
  } catch {
    return `INV-${new Date().getFullYear()}-0001`
  }
}
