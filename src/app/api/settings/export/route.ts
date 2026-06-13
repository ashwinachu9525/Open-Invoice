import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const companyId = session.user.companyId

    const [user, company, invoices, customers, items, bankAccounts] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true, createdAt: true, role: true } }),
      companyId ? prisma.company.findUnique({ where: { id: companyId } }) : null,
      companyId ? prisma.invoice.findMany({ where: { companyId } }) : [],
      companyId ? prisma.customer.findMany({ where: { companyId } }) : [],
      companyId ? prisma.productCatalog.findMany({ where: { companyId } }) : [],
      companyId ? prisma.bankAccount.findMany({ where: { companyId } }) : [],
    ])

    const exportData = {
      exportDate: new Date().toISOString(),
      user,
      company,
      invoices,
      customers,
      productCatalog: items,
      bankAccounts,
    }

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="data-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error) {
    console.error("Data export error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
