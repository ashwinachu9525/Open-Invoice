import OpenAI from "openai"
import { prisma } from "@/lib/prisma"

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured")
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

export async function generateBusinessInsights(companyId: string) {
  const [invoices, customers, payments] = await Promise.all([
    prisma.invoice.findMany({
      where: { companyId, deletedAt: null },
      include: { customer: true, payments: true },
    }),
    prisma.customer.count({ where: { companyId, deletedAt: null } }),
    prisma.payment.findMany({
      where: { invoice: { companyId } },
    }),
  ])

  const totalRevenue = invoices
    .filter((i) => i.status === "PAID")
    .reduce((s, i) => s + i.finalAmount, 0)
  const outstanding = invoices
    .filter((i) => ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"].includes(i.status))
    .reduce((s, i) => s + i.balanceDue, 0)
  const overdue = invoices
    .filter((i) => i.status === "OVERDUE")
    .reduce((s, i) => s + i.balanceDue, 0)

  const summary = {
    totalInvoices: invoices.length,
    totalCustomers: customers,
    totalRevenue,
    outstanding,
    overdue,
    paidCount: invoices.filter((i) => i.status === "PAID").length,
    overdueCount: invoices.filter((i) => i.status === "OVERDUE").length,
  }

  if (!process.env.OPENAI_API_KEY) {
    return { summary, insights: "Configure OPENAI_API_KEY for AI insights." }
  }

  const openai = getOpenAI()
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a financial advisor for Indian SMBs. Analyze invoice data and provide actionable insights in 3-5 bullet points.",
      },
      {
        role: "user",
        content: `Analyze this business data: ${JSON.stringify(summary)}`,
      },
    ],
  })

  return {
    summary,
    insights: response.choices[0]?.message?.content ?? "",
  }
}
