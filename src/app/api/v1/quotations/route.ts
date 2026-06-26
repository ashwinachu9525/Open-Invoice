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

// GET: Retrieve quotations list for the authorized company
export async function GET(req: NextRequest) {
  const authResult = await authenticateApiKey(req)
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { company } = authResult

  try {
    const searchParams = req.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)
    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1)

    const quotations = await prisma.quotation.findMany({
      where: { companyId: company.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
        items: true,
      },
    })

    const total = await prisma.quotation.count({
      where: { companyId: company.id, deletedAt: null },
    })

    return NextResponse.json({
      success: true,
      data: quotations,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("GET Quotations API Error:", error)
    return NextResponse.json({ error: "Failed to fetch quotations" }, { status: 500 })
  }
}

// POST: Create a new quotation programmatically
export async function POST(req: NextRequest) {
  const authResult = await authenticateApiKey(req)
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { company } = authResult

  try {
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

    // Create quotation in a prisma transaction
    const quotation = await prisma.$transaction(async (tx) => {
      return await tx.quotation.create({
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
          themeColor: parsed.data.themeColor || "#4f46e5",
          themeFont: parsed.data.themeFont || "Helvetica",
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
    })

    // Audit logging
    const userId = await getAuditUserId(company.id)
    if (userId) {
      await createAuditLog({
        companyId: company.id,
        userId,
        action: "CREATE",
        entity: "Quotation",
        entityId: quotation.id,
      })
    }

    revalidatePath("/quotations")
    revalidatePath("/dashboard")

    return NextResponse.json({
      success: true,
      message: "Quotation created successfully",
      quotationId: quotation.id,
      quotationNumber: quotation.quotationNumber,
      finalAmount: quotation.finalAmount,
    }, { status: 201 })

  } catch (error) {
    console.error("POST Quotation API Error:", error)
    return NextResponse.json({ error: "Failed to create quotation" }, { status: 500 })
  }
}
