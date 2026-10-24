import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getTenantDb } from "@/lib/tenant-db"
import { invalidateInvoicePdfCache } from "@/services/pdf"
import { revalidatePath } from "next/cache"

async function getAuthenticatedCompany() {
  const session = await auth()
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, companyId: true },
  })

  if (!user?.companyId) return null
  return { user, companyId: user.companyId }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authData = await getAuthenticatedCompany()
    if (!authData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const db = await getTenantDb(authData.companyId)

    const customer = await db.customer.findFirst({
      where: { id, deletedAt: null },
    })

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    return NextResponse.json({ customer })
  } catch (error) {
    console.error("GET /api/customers/[id] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authData = await getAuthenticatedCompany()
    if (!authData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Map potential alias names for the setting
    const showContactPersonName =
      body.showContactPersonName !== undefined
        ? Boolean(body.showContactPersonName)
        : body.showContactPerson !== undefined
        ? Boolean(body.showContactPerson)
        : body.showContactPersonOnInvoice !== undefined
        ? Boolean(body.showContactPersonOnInvoice)
        : undefined

    const updateData: any = {}
    if (showContactPersonName !== undefined) {
      updateData.showContactPersonName = showContactPersonName
    }
    if (body.name !== undefined) updateData.name = body.name
    if (body.companyName !== undefined) updateData.companyName = body.companyName
    if (body.gstin !== undefined) updateData.gstin = body.gstin
    if (body.pan !== undefined) updateData.pan = body.pan
    if (body.email !== undefined) updateData.email = body.email
    if (body.phone !== undefined) updateData.phone = body.phone
    if (body.address !== undefined) updateData.address = body.address
    if (body.state !== undefined) updateData.state = body.state
    if (body.country !== undefined) updateData.country = body.country

    const db = await getTenantDb(authData.companyId)

    const existing = await db.customer.findFirst({
      where: { id, deletedAt: null },
    })
    if (!existing) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    const customer = await db.customer.update({
      where: { id },
      data: updateData,
    })

    // Invalidate invoice PDF and path caches for this customer
    try {
      const invoices = await db.invoice.findMany({
        where: { customerId: id },
        select: { id: true },
      })
      for (const inv of invoices) {
        await invalidateInvoicePdfCache(inv.id)
        revalidatePath(`/invoices/${inv.id}`)
      }
      revalidatePath("/invoices")
      revalidatePath(`/customers/${id}`)
      revalidatePath("/customers")
    } catch (cacheErr) {
      console.warn("Failed to invalidate caches after customer update:", cacheErr)
    }

    return NextResponse.json({ success: true, customer })
  } catch (error) {
    console.error("PATCH /api/customers/[id] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PATCH(request, { params })
}
