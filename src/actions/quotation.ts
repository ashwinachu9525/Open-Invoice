"use server"

import { prisma } from "@/lib/prisma"
import { quotationSchema } from "@/validations/quotation"
import { calculateInvoiceTax } from "@/services/tax-engine"
import { createAuditLog } from "@/services/audit"
import { requireCompany } from "@/lib/auth-helpers"
import { revalidatePath } from "next/cache"
import { QuotationStatus, InvoiceStatus } from "@prisma/client"

export async function createQuotation(data: unknown) {
  try {
    const { session, company } = await requireCompany()
    const parsed = quotationSchema.safeParse(data)
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

    const quotation = await prisma.$transaction(async (tx) => {
      const q = await tx.quotation.create({
        data: {
          companyId: company.id,
          customerId: customer.id,
          quotationNumber: parsed.data.quotationNumber,
          date: parsed.data.date,
          expiryDate: parsed.data.expiryDate,
          currency: parsed.data.currency,
          exchangeRate: parsed.data.exchangeRate,
          notes: parsed.data.notes,
          terms: parsed.data.terms,
          themeColor: parsed.data.themeColor,
          themeFont: parsed.data.themeFont,
          status: QuotationStatus.DRAFT,
          subTotal: tax.subTotal,
          totalDiscount: tax.totalDiscount,
          totalTax: tax.totalTax,
          cgstAmount: tax.cgstAmount,
          sgstAmount: tax.sgstAmount,
          igstAmount: tax.igstAmount,
          tdsPercentage: tax.tdsPercentage,
          tdsAmount: tax.tdsAmount,
          finalAmount: tax.finalAmount,
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
        include: { items: true, customer: true },
      })
      return q
    })

    await createAuditLog({
      companyId: company.id,
      userId: session.user.id,
      action: "CREATE",
      entity: "Quotation",
      entityId: quotation.id,
    })

    revalidatePath("/quotations")
    revalidatePath("/dashboard")
    return { success: true, quotationId: quotation.id }
  } catch (error) {
    console.error("Create quotation error:", error)
    return { error: error instanceof Error ? error.message : "Failed to create quotation" }
  }
}

export async function updateQuotation(id: string, data: unknown) {
  return { error: "Update not implemented yet" }
}

export async function convertToInvoice(quotationId: string) {
  try {
    const { session, company } = await requireCompany()
    
    const quotation = await prisma.quotation.findFirst({
      where: { id: quotationId, companyId: company.id, deletedAt: null },
      include: { items: true }
    })
    
    if (!quotation) return { error: "Quotation not found" }
    if (quotation.status === "INVOICED") return { error: "Quotation already converted to invoice" }
    
    const count = await prisma.invoice.count({ where: { companyId: company.id } })
    const year = new Date().getFullYear()
    const prefix = company.invoicePrefix || "INV"
    const newInvoiceNumber = `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`
    
    const newInvoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          companyId: company.id,
          customerId: quotation.customerId,
          invoiceNumber: newInvoiceNumber,
          date: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
          currency: quotation.currency,
          exchangeRate: quotation.exchangeRate,
          notes: quotation.notes,
          terms: quotation.terms,
          themeColor: quotation.themeColor,
          themeFont: quotation.themeFont,
          status: InvoiceStatus.DRAFT,
          subTotal: quotation.subTotal,
          totalDiscount: quotation.totalDiscount,
          totalTax: quotation.totalTax,
          cgstAmount: quotation.cgstAmount,
          sgstAmount: quotation.sgstAmount,
          igstAmount: quotation.igstAmount,
          tdsPercentage: quotation.tdsPercentage,
          tdsAmount: quotation.tdsAmount,
          finalAmount: quotation.finalAmount,
          balanceDue: quotation.finalAmount,
          items: {
            create: quotation.items.map((item) => ({
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
            create: { status: InvoiceStatus.DRAFT, note: `Converted from Quotation ${quotation.quotationNumber}` },
          },
        }
      })
      
      await tx.quotation.update({
        where: { id: quotationId },
        data: { status: QuotationStatus.INVOICED }
      })
      
      return inv
    })

    await createAuditLog({
      companyId: company.id,
      userId: session.user.id,
      action: "CREATE",
      entity: "Invoice",
      entityId: newInvoice.id,
      details: { convertedFrom: quotation.id }
    })

    revalidatePath("/quotations")
    revalidatePath("/invoices")
    return { success: true, invoiceId: newInvoice.id }
  } catch (error) {
    console.error(error)
    return { error: "Failed to convert to invoice" }
  }
}

export async function getNextQuotationNumber() {
  try {
    const { company } = await requireCompany()
    const count = await prisma.quotation.count({ where: { companyId: company.id } })
    const year = new Date().getFullYear()
    return `QT-${year}-${String(count + 1).padStart(4, "0")}`
  } catch {
    return `QT-${new Date().getFullYear()}-0001`
  }
}

export async function getQuotations(opts?: {
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
              { quotationNumber: { contains: search } },
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

    const [quotations, total, allForStats] = await Promise.all([
      prisma.quotation.findMany({
        where,
        include: { customer: true },
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.quotation.count({ where }),
      prisma.quotation.findMany({
        where,
        select: { finalAmount: true, status: true }
      })
    ])

    const totalAmount = allForStats.reduce((sum, q) => sum + q.finalAmount, 0)
    const acceptedCount = allForStats.filter((q) => q.status === "ACCEPTED").length
    const pendingCount = allForStats.filter((q) => ["SENT", "DRAFT"].includes(q.status)).length

    return { 
      quotations, 
      totalPages: Math.ceil(total / limit), 
      totalQuotations: total,
      stats: { totalAmount, acceptedCount, pendingCount }
    }
  } catch {
    return { quotations: [], totalPages: 0, totalQuotations: 0, stats: { totalAmount: 0, acceptedCount: 0, pendingCount: 0 } }
  }
}

export async function getQuotation(id: string) {
  try {
    const { company } = await requireCompany()
    return await prisma.quotation.findFirst({
      where: { id, companyId: company.id, deletedAt: null },
      include: {
        customer: true,
        items: true,
        company: true,
      },
    })
  } catch {
    return null
  }
}

export async function updateQuotationStatus(
  id: string,
  status: QuotationStatus,
  note?: string
) {
  try {
    const { session, company } = await requireCompany()
    const quotation = await prisma.quotation.findFirst({
      where: { id, companyId: company.id, deletedAt: null },
    })
    if (!quotation) return { error: "Quotation not found" }

    await prisma.quotation.update({ where: { id }, data: { status } })

    await createAuditLog({
      companyId: company.id,
      userId: session.user.id,
      action: "STATUS_CHANGE",
      entity: "Quotation",
      entityId: id,
      details: { status, note },
    })

    revalidatePath(`/quotations/${id}`)
    revalidatePath("/quotations")
    revalidatePath("/dashboard")
    return { success: true }
  } catch {
    return { error: "Failed to update status" }
  }
}

export async function deleteQuotation(id: string) {
  try {
    const { session, company } = await requireCompany()
    await prisma.quotation.update({
      where: { id, companyId: company.id },
      data: { deletedAt: new Date() },
    })

    await createAuditLog({
      companyId: company.id,
      userId: session.user.id,
      action: "DELETE",
      entity: "Quotation",
      entityId: id,
    })

    revalidatePath("/quotations")
    revalidatePath("/dashboard")
    return { success: true }
  } catch {
    return { error: "Failed to delete quotation" }
  }
}

export async function bulkDeleteQuotations(ids: string[]) {
  try {
    const { session, company } = await requireCompany()
    
    await prisma.quotation.updateMany({
      where: { id: { in: ids }, companyId: company.id },
      data: { deletedAt: new Date() },
    })

    await createAuditLog({
      companyId: company.id,
      userId: session.user.id,
      action: "DELETE",
      entity: "Quotation",
      entityId: "bulk",
      details: { count: ids.length, ids }
    })

    revalidatePath("/quotations")
    revalidatePath("/dashboard")
    return { success: true }
  } catch {
    return { error: "Failed to delete quotations" }
  }
}

export async function restoreQuotation(id: string) {
  try {
    const { session, company } = await requireCompany()
    
    await prisma.quotation.update({
      where: { id, companyId: company.id },
      data: { deletedAt: null, status: QuotationStatus.DRAFT },
    })

    await createAuditLog({
      companyId: company.id,
      userId: session.user.id,
      action: "UPDATE",
      entity: "Quotation",
      entityId: id,
      details: { action: "restored" }
    })

    revalidatePath("/quotations")
    revalidatePath("/trash")
    revalidatePath("/dashboard")
    return { success: true }
  } catch {
    return { error: "Failed to restore quotation" }
  }
}

export async function permanentlyDeleteQuotation(id: string) {
  try {
    const { session, company } = await requireCompany()
    
    await prisma.quotation.delete({
      where: { id, companyId: company.id },
    })

    await createAuditLog({
      companyId: company.id,
      userId: session.user.id,
      action: "DELETE",
      entity: "Quotation",
      entityId: id,
      details: { action: "permanently deleted" }
    })

    revalidatePath("/trash")
    return { success: true }
  } catch {
    return { error: "Failed to permanently delete quotation" }
  }
}

export async function cloneQuotation(id: string) {
  try {
    const { session, company } = await requireCompany()
    
    const quotation = await prisma.quotation.findFirst({
      where: { id, companyId: company.id, deletedAt: null },
      include: { items: true }
    })
    
    if (!quotation) return { error: "Quotation not found" }
    
    const newQuotationNumber = await getNextQuotationNumber()
    
    const newQuotation = await prisma.quotation.create({
      data: {
        companyId: company.id,
        customerId: quotation.customerId,
        quotationNumber: newQuotationNumber,
        date: new Date(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
        currency: quotation.currency,
        exchangeRate: quotation.exchangeRate,
        notes: quotation.notes,
        terms: quotation.terms,
        themeColor: quotation.themeColor,
        themeFont: quotation.themeFont,
        status: QuotationStatus.DRAFT,
        subTotal: quotation.subTotal,
        totalDiscount: quotation.totalDiscount,
        totalTax: quotation.totalTax,
        cgstAmount: quotation.cgstAmount,
        sgstAmount: quotation.sgstAmount,
        igstAmount: quotation.igstAmount,
        tdsPercentage: quotation.tdsPercentage,
        tdsAmount: quotation.tdsAmount,
        finalAmount: quotation.finalAmount,
        items: {
          create: quotation.items.map((item) => ({
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
      }
    })

    await createAuditLog({
      companyId: company.id,
      userId: session.user.id,
      action: "CREATE",
      entity: "Quotation",
      entityId: newQuotation.id,
      details: { clonedFrom: quotation.id }
    })

    revalidatePath("/quotations")
    revalidatePath("/dashboard")
    return { success: true, id: newQuotation.id }
  } catch (error) {
    console.error(error)
    return { error: "Failed to clone quotation" }
  }
}

import { generateQuotationPdf } from "@/services/pdf"
import { sendQuotationEmail } from "@/services/smtp"

export async function sendQuotationToClient(quotationId: string) {
  try {
    const { session, company } = await requireCompany()
    
    const quotation = await prisma.quotation.findFirst({
      where: { id: quotationId, companyId: company.id },
      include: { customer: true, company: true }
    })
    
    if (!quotation) return { error: "Quotation not found" }
    if (!quotation.customer.email) return { error: "Customer does not have an email address" }

    const pdfBuffer = await generateQuotationPdf(quotation.id)

    const contactPersonName = quotation.customer.name
    const quotationNumber = quotation.quotationNumber
    const companyEmail = quotation.company.email || "No email provided"
    const companyPhone = quotation.company.phone || "No phone provided"
    const companyName = quotation.company.name

    const htmlBody = `
      <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
        <p>Hi ${contactPersonName},</p>
        <p>Please find the attached quotation <b>${quotationNumber}</b> for your reference.</p>
        <p>If you have any questions or need any clarification regarding this quotation, please feel free to contact us using the details below.</p>
        <p>
          <b>Email:</b> ${companyEmail}<br>
          <b>Contact Number:</b> ${companyPhone}
        </p>
        <p>Thank you for considering our services.</p>
        <p>Best Regards,<br>${companyName}</p>
        <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888;"><b>Note:</b> This is a system-generated email. Please do not reply directly to this message.</p>
      </div>
    `

    await sendQuotationEmail({
      companyId: company.id,
      quotationId: quotationId,
      to: quotation.customer.email,
      subject: `Quotation ${quotationNumber}`,
      html: htmlBody,
      attachments: [{
        filename: `${quotationNumber}.pdf`,
        content: Buffer.from(pdfBuffer)
      }]
    })

    if (quotation.status === "DRAFT") {
      await prisma.quotation.update({
        where: { id: quotation.id },
        data: { status: "SENT" }
      })
    }

    await createAuditLog({
      companyId: company.id,
      userId: session.user.id,
      action: "QUOTATION_SENT",
      entity: "Quotation",
      entityId: quotation.id,
      details: { message: `Quotation ${quotation.quotationNumber} was emailed to ${quotation.customer.email}` }
    })

    revalidatePath(`/quotations/${quotation.id}`)
    revalidatePath(`/quotations`)
    revalidatePath(`/dashboard`)

    return { success: true }
  } catch (e) {
    console.error("Email send error:", e)
    return { error: e instanceof Error ? e.message : "Failed to send email" }
  }
}

