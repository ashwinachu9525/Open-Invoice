import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { quotationSchema } from "@/validations/quotation"
import { calculateInvoiceTax } from "@/services/tax-engine"
import { QuotationStatus } from "@prisma/client"
import { authenticateApiKey } from "@/lib/api-auth"
import { createAuditLog } from "@/services/audit"
import { revalidatePath } from "next/cache"

// Helper to get audit user for the company
async function getAuditUserId(companyId: string): Promise<string> {
  const user = await prisma.user.findFirst({ where: { companyId } })
  return user?.id || ""
}

// GET: Retrieve a single quotation's details
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
    const quotation = await prisma.quotation.findFirst({
      where: { id, companyId: company.id, deletedAt: null },
      include: {
        customer: true,
        items: true,
      },
    })

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: quotation })
  } catch (error) {
    console.error("GET Quotation Details API Error:", error)
    return NextResponse.json({ error: "Failed to fetch quotation" }, { status: 500 })
  }
}

// PUT: Update a quotation
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
    const existing = await prisma.quotation.findFirst({
      where: { id, companyId: company.id, deletedAt: null },
    })

    if (!existing) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 })
    }

    if (existing.status === QuotationStatus.INVOICED) {
      return NextResponse.json({ error: "Invoiced quotations cannot be edited" }, { status: 400 })
    }

    const body = await req.json()
    // Parse date strings to Date objects for Zod schema
    if (body.date) body.date = new Date(body.date)
    if (body.expiryDate) body.expiryDate = new Date(body.expiryDate)

    const parsed = quotationSchema.safeParse(body)
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

    // Calculate tax & final values using central tax engine
    const tax = calculateInvoiceTax({
      items: parsed.data.items,
      sellerState: company.state || "Default",
      buyerState: customer.state || "Default",
      tdsPercentage: parsed.data.tdsPercentage,
    })

    // Update in a transaction
    const quotation = await prisma.$transaction(async (tx) => {
      // Delete old items
      await tx.quotationItem.deleteMany({ where: { quotationId: id } })

      // Update quotation and create new items
      return await tx.quotation.update({
        where: { id },
        data: {
          customerId: customer.id,
          quotationNumber: parsed.data.quotationNumber,
          date: parsed.data.date,
          expiryDate: parsed.data.expiryDate,
          currency: parsed.data.currency,
          exchangeRate: parsed.data.exchangeRate,
          notes: parsed.data.notes,
          terms: parsed.data.terms,
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
        entity: "Quotation",
        entityId: id,
      })
    }

    revalidatePath("/quotations")
    revalidatePath(`/quotations/${id}`)
    revalidatePath("/dashboard")

    return NextResponse.json({
      success: true,
      message: "Quotation updated successfully",
      data: quotation,
    })
  } catch (error) {
    console.error("PUT Quotation API Error:", error)
    return NextResponse.json({ error: "Failed to update quotation" }, { status: 500 })
  }
}

// DELETE: Soft-delete a quotation
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
    const existing = await prisma.quotation.findFirst({
      where: { id, companyId: company.id, deletedAt: null },
    })

    if (!existing) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 })
    }

    await prisma.quotation.update({
      where: { id, companyId: company.id },
      data: { deletedAt: new Date() },
    })

    // Audit logging
    const userId = await getAuditUserId(company.id)
    if (userId) {
      await createAuditLog({
        companyId: company.id,
        userId,
        action: "DELETE",
        entity: "Quotation",
        entityId: id,
      })
    }

    revalidatePath("/quotations")
    revalidatePath("/dashboard")

    return NextResponse.json({ success: true, message: "Quotation deleted successfully" })
  } catch (error) {
    console.error("DELETE Quotation API Error:", error)
    return NextResponse.json({ error: "Failed to delete quotation" }, { status: 500 })
  }
}
