import { prisma } from "@/lib/prisma"
import { formatINR } from "@/services/tax-engine"

export async function generateGstReport(companyId: string, from: Date, to: Date) {
  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      deletedAt: null,
      date: { gte: from, lte: to },
      status: { notIn: ["DRAFT", "CANCELLED"] },
    },
    include: { customer: true },
    orderBy: { date: "asc" },
  })

  return invoices.map((inv) => ({
    invoiceNumber: inv.invoiceNumber,
    date: inv.date.toISOString().split("T")[0],
    customer: inv.customer.name,
    customerGstin: inv.customer.gstin ?? "",
    taxableAmount: inv.subTotal - inv.totalDiscount,
    cgst: inv.cgstAmount,
    sgst: inv.sgstAmount,
    igst: inv.igstAmount,
    totalTax: inv.totalTax,
    total: inv.finalAmount,
  }))
}

export async function generateTdsReport(companyId: string, from: Date, to: Date) {
  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      deletedAt: null,
      date: { gte: from, lte: to },
      tdsAmount: { gt: 0 },
    },
    include: { customer: true },
  })

  return invoices.map((inv) => ({
    invoiceNumber: inv.invoiceNumber,
    date: inv.date.toISOString().split("T")[0],
    customer: inv.customer.name,
    customerPan: inv.customer.pan ?? "",
    taxableAmount: inv.subTotal - inv.totalDiscount,
    tdsRate: inv.tdsPercentage,
    tdsAmount: inv.tdsAmount,
    netPayable: inv.finalAmount,
  }))
}

export async function generateOutstandingReport(companyId: string) {
  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      deletedAt: null,
      balanceDue: { gt: 0 },
      status: { in: ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"] },
    },
    include: { customer: true },
    orderBy: { dueDate: "asc" },
  })

  return invoices.map((inv) => ({
    invoiceNumber: inv.invoiceNumber,
    customer: inv.customer.name,
    dueDate: inv.dueDate.toISOString().split("T")[0],
    finalAmount: inv.finalAmount,
    amountPaid: inv.amountPaid,
    balanceDue: inv.balanceDue,
    status: inv.status,
    daysOverdue: Math.max(
      0,
      Math.floor((Date.now() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24))
    ),
  }))
}

export function toCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return ""
  const headers = Object.keys(data[0])
  const rows = data.map((row) =>
    headers.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(",")
  )
  return [headers.join(","), ...rows].join("\n")
}

export { formatINR }
