import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashToken } from "@/lib/crypto"
import { invoiceSchema } from "@/validations/invoice"
import { calculateInvoiceTax } from "@/services/tax-engine"
import { InvoiceStatus } from "@prisma/client"

// Helper to authenticate request using API key
async function authenticate(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key")
  if (!apiKey) {
    return { error: "API key is missing in x-api-key header", status: 401 }
  }

  try {
    const keyHash = hashToken(apiKey)
    const keyRecord = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: { company: true },
    })

    if (!keyRecord || !keyRecord.isActive) {
      return { error: "Invalid or inactive API key", status: 401 }
    }

    // Check expiration if set
    if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
      return { error: "API key has expired", status: 401 }
    }

    return { company: keyRecord.company }
  } catch (error) {
    console.error("API Key authentication error:", error)
    return { error: "Authentication failed", status: 500 }
  }
}

// GET: Retrieve invoices list for the authorized company
export async function GET(req: NextRequest) {
  const authResult = await authenticate(req)
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { company } = authResult

  try {
    const searchParams = req.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)
    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1)

    const invoices = await prisma.invoice.findMany({
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

    const total = await prisma.invoice.count({
      where: { companyId: company.id, deletedAt: null },
    })

    return NextResponse.json({
      success: true,
      data: invoices,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("GET Invoices API Error:", error)
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 })
  }
}

// POST: Create a new invoice programmatically
export async function POST(req: NextRequest) {
  const authResult = await authenticate(req)
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { company } = authResult

  try {
    const body = await req.json()
    const parsed = invoiceSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      )
    }

    // Check SaaS limits if app runs in Paid SaaS Mode
    const isTrialActive = company.trialEndsAt && new Date() < new Date(company.trialEndsAt)
    if (process.env.APP_MODE === "paid" && company.subscriptionTier === "FREE" && !isTrialActive) {
      const invoiceCount = await prisma.invoice.count({
        where: { companyId: company.id, deletedAt: null },
      })
      if (invoiceCount >= 5) {
        return NextResponse.json(
          { error: "FREE_LIMIT_REACHED", message: "You have reached the maximum limit of 5 invoices on the Free plan. Please upgrade to Pro." },
          { status: 403 }
        )
      }
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

    // Create invoice in a prisma transaction
    const invoice = await prisma.$transaction(async (tx) => {
      return await tx.invoice.create({
        data: {
          companyId: company.id,
          customerId: customer.id,
          invoiceNumber: parsed.data.invoiceNumber,
          date: new Date(parsed.data.date),
          dueDate: new Date(parsed.data.dueDate),
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
            create: { status: InvoiceStatus.DRAFT, note: "Invoice created via API" },
          },
        },
        include: { items: true, customer: true },
      })
    })

    return NextResponse.json({
      success: true,
      message: "Invoice created successfully",
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      finalAmount: invoice.finalAmount,
    }, { status: 201 })

  } catch (error) {
    console.error("POST Invoice API Error:", error)
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 })
  }
}
