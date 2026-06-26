import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { invoiceSchema } from "@/validations/invoice"
import { calculateInvoiceTax } from "@/services/tax-engine"
import { InvoiceStatus } from "@prisma/client"
import { authenticateApiKey } from "@/lib/api-auth"
import { createAuditLog } from "@/services/audit"
import { invalidateCachePattern } from "@/lib/redis"
import { revalidatePath } from "next/cache"

// Helper to get audit user for the company
async function getAuditUserId(companyId: string): Promise<string> {
  const user = await prisma.user.findFirst({ where: { companyId } })
  return user?.id || ""
}

// GET: Retrieve a single invoice's details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateApiKey(req)
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { company } = authResult
  const { id } = await params

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id, companyId: company.id, deletedAt: null },
      include: {
        customer: true,
        items: true,
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: invoice })
  } catch (error) {
    console.error("GET Invoice Details API Error:", error)
    return NextResponse.json({ error: "Failed to fetch invoice" }, { status: 500 })
  }
}

// PUT: Update an invoice
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateApiKey(req)
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { company } = authResult
  const { id } = await params

  try {
    const existing = await prisma.invoice.findFirst({
      where: { id, companyId: company.id, deletedAt: null },
    })

    if (!existing) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    if (existing.status === "PAID") {
      return NextResponse.json({ error: "Paid invoices cannot be edited" }, { status: 400 })
    }

    const body = await req.json()
    // Parse date strings to Date objects for Zod schema
    if (body.date) body.date = new Date(body.date)
    if (body.dueDate) body.dueDate = new Date(body.dueDate)

    const parsed = invoiceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      )
    }

    const customer = await prisma.customer.findFirst({
      where: { id: parsed.data.customerId, companyId: company.id, deletedAt: null },
    })
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    // Calculate tax & final values
    const tax = calculateInvoiceTax({
      items: parsed.data.items,
      sellerState: company.state || "Default",
      buyerState: customer.state || "Default",
      tdsPercentage: parsed.data.tdsPercentage,
    })

    // Update in a transaction
    const invoice = await prisma.$transaction(async (tx) => {
      // Delete old items
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } })

      // Update invoice and create new items
      return await tx.invoice.update({
        where: { id },
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
          themeColor: parsed.data.themeColor || "#4f46e5",
          themeFont: parsed.data.themeFont || "Helvetica",
          subTotal: tax.subTotal,
          totalDiscount: tax.totalDiscount,
          totalTax: tax.totalTax,
          cgstAmount: tax.cgstAmount,
          sgstAmount: tax.sgstAmount,
          igstAmount: tax.igstAmount,
          tdsPercentage: tax.tdsPercentage,
          tdsAmount: tax.tdsAmount,
          finalAmount: tax.finalAmount,
          balanceDue: Math.max(0, tax.finalAmount - existing.amountPaid),
          status: existing.amountPaid > 0 && tax.finalAmount <= existing.amountPaid ? "PAID" : existing.status,
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
    })

    // Audit logging
    const userId = await getAuditUserId(company.id)
    if (userId) {
      await createAuditLog({
        companyId: company.id,
        userId,
        action: "UPDATE",
        entity: "Invoice",
        entityId: id,
      })
    }

    // Invalidate cache
    await invalidateCachePattern(`invoice:${company.id}:${id}`)
    await invalidateCachePattern(`invoices:${company.id}:*`)

    revalidatePath(`/invoices/${id}`)
    revalidatePath("/invoices")
    revalidatePath("/dashboard")

    return NextResponse.json({
      success: true,
      message: "Invoice updated successfully",
      data: invoice,
    })
  } catch (error) {
    console.error("PUT Invoice API Error:", error)
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 })
  }
}

// DELETE: Cancel / Soft-delete an invoice
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateApiKey(req)
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { company } = authResult
  const { id } = await params

  try {
    const existing = await prisma.invoice.findFirst({
      where: { id, companyId: company.id, deletedAt: null },
    })

    if (!existing) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    await prisma.invoice.update({
      where: { id, companyId: company.id },
      data: { deletedAt: new Date(), status: InvoiceStatus.CANCELLED },
    })

    // Audit logging
    const userId = await getAuditUserId(company.id)
    if (userId) {
      await createAuditLog({
        companyId: company.id,
        userId,
        action: "DELETE",
        entity: "Invoice",
        entityId: id,
      })
    }

    // Invalidate cache
    await invalidateCachePattern(`invoice:${company.id}:${id}`)
    await invalidateCachePattern(`invoices:${company.id}:*`)

    revalidatePath("/invoices")
    revalidatePath("/dashboard")

    return NextResponse.json({ success: true, message: "Invoice cancelled/deleted successfully" })
  } catch (error) {
    console.error("DELETE Invoice API Error:", error)
    return NextResponse.json({ error: "Failed to delete invoice" }, { status: 500 })
  }
}
