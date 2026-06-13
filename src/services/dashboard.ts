import { prisma } from "@/lib/prisma"

export async function getDashboardStats(companyId: string) {
  const [invoices, customers] = await Promise.all([
    prisma.invoice.findMany({
      where: { companyId, deletedAt: null },
      include: { payments: true, customer: { select: { name: true } } },
    }),
    prisma.customer.count({
      where: { companyId, deletedAt: null },
    })
  ])

  const activeInvoices = invoices.filter(i => i.status !== "CANCELLED" && i.status !== "DRAFT")

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
  const agingBuckets = getAgingBuckets(activeInvoices)
  const collectionEfficiency = getCollectionEfficiency(activeInvoices)

  return {
    totalRevenue,
    pendingAmount,
    overdueAmount,
    gstCollected,
    tdsDeducted,
    activeCustomers: customers,
    invoicesSent: activeInvoices.length,
    monthlyRevenue,
    customerInsights,
    agingBuckets,
    collectionEfficiency,
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
  invoices: { customerId: string; finalAmount: number; balanceDue: number; status: string, customer?: { name: string } }[]
) {
  const map = new Map<string, { name: string, revenue: number; outstanding: number }>()

  for (const inv of invoices) {
    const existing = map.get(inv.customerId) ?? { name: inv.customer?.name || "Unknown", revenue: 0, outstanding: 0 }
    existing.revenue += inv.finalAmount
    if (inv.balanceDue > 0) existing.outstanding += inv.balanceDue
    map.set(inv.customerId, existing)
  }

  return Array.from(map.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5)
    .map(([customerId, data]) => ({ customerId, ...data }))
}

function getAgingBuckets(invoices: { dueDate: Date; balanceDue: number; status: string }[]) {
  const buckets = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0, "Current": 0 }
  const now = new Date()
  now.setHours(0,0,0,0)

  for (const inv of invoices) {
    if (inv.status === "PAID" || inv.balanceDue <= 0) continue
    
    const dueDate = new Date(inv.dueDate)
    dueDate.setHours(0,0,0,0)
    
    const diffTime = now.getTime() - dueDate.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) buckets["Current"] += inv.balanceDue
    else if (diffDays <= 30) buckets["0-30"] += inv.balanceDue
    else if (diffDays <= 60) buckets["31-60"] += inv.balanceDue
    else if (diffDays <= 90) buckets["61-90"] += inv.balanceDue
    else buckets["90+"] += inv.balanceDue
  }
  
  return buckets
}

function getCollectionEfficiency(invoices: { dueDate: Date; payments: { amount: number, date: Date }[] }[]) {
  let paidOnTime = 0
  let paidLate = 0

  for (const inv of invoices) {
    if (!inv.payments || inv.payments.length === 0) continue
    
    const dueDate = new Date(inv.dueDate)
    dueDate.setHours(23,59,59,999)

    for (const payment of inv.payments) {
      if (new Date(payment.date) <= dueDate) {
        paidOnTime += payment.amount
      } else {
        paidLate += payment.amount
      }
    }
  }

  const totalCollected = paidOnTime + paidLate
  if (totalCollected === 0) return 100 // default if no collections

  return Math.round((paidOnTime / totalCollected) * 100)
}
