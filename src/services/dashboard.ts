import { prisma } from "@/lib/prisma"

export async function getDashboardStats(companyId: string) {
  const invoices = await prisma.invoice.findMany({
    where: { companyId, deletedAt: null },
    include: { payments: true },
  })

  const customers = await prisma.customer.count({
    where: { companyId, deletedAt: null },
  })

  const activeInvoices = invoices.filter(i => i.status !== "CANCELLED")

  const totalRevenue = activeInvoices.reduce((s, i) => s + i.finalAmount, 0)

  const pendingAmount = activeInvoices
    .filter((i) => i.status !== "PAID")
    .reduce((s, i) => s + i.balanceDue, 0)

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const overdueAmount = activeInvoices
    .filter((i) => i.status === "OVERDUE" || (i.status !== "PAID" && new Date(i.dueDate) < now))
    .reduce((s, i) => s + i.balanceDue, 0)

  const gstCollected = activeInvoices.reduce((s, i) => s + i.totalTax, 0)
  const tdsDeducted = activeInvoices.reduce((s, i) => s + i.tdsAmount, 0)

  const monthlyRevenue = getMonthlyRevenue(activeInvoices)
  const customerInsights = getCustomerInsights(activeInvoices)

  return {
    totalRevenue,
    pendingAmount,
    overdueAmount,
    gstCollected,
    tdsDeducted,
    activeCustomers: customers,
    invoicesSent: invoices.filter((i) => i.status !== "DRAFT" && i.status !== "CANCELLED").length,
    monthlyRevenue,
    customerInsights,
  }
}

function getMonthlyRevenue(
  invoices: { date: Date; finalAmount: number; status: string }[]
) {
  const months: Record<string, number> = {}
  const now = new Date()

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" })
    months[key] = 0
  }

  for (const inv of invoices) {
    const key = inv.date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" })
    if (key in months) months[key] += inv.finalAmount
  }

  return Object.entries(months).map(([month, revenue]) => ({ month, revenue }))
}

function getCustomerInsights(
  invoices: { customerId: string; finalAmount: number; balanceDue: number; status: string }[]
) {
  const map = new Map<string, { revenue: number; outstanding: number }>()

  for (const inv of invoices) {
    const existing = map.get(inv.customerId) ?? { revenue: 0, outstanding: 0 }
    existing.revenue += inv.finalAmount
    if (inv.balanceDue > 0) existing.outstanding += inv.balanceDue
    map.set(inv.customerId, existing)
  }

  return Array.from(map.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5)
    .map(([customerId, data]) => ({ customerId, ...data }))
}
