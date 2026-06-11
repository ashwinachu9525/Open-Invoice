import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { FileSpreadsheet } from "lucide-react"
import { requireCompany } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { ComplianceClient } from "./compliance-client"
import { Separator } from "@/components/ui/separator"
import { ReportsCharts } from "./reports-charts"

const reports = [
  {
    title: "GST Report",
    description: "CGST, SGST, IGST breakdown for all invoices",
    type: "gst",
  },
  {
    title: "TDS Report",
    description: "Tax deducted at source summary",
    type: "tds",
  },
  {
    title: "Outstanding Invoices",
    description: "Unpaid and overdue invoice report",
    type: "outstanding",
  },
]

export default async function ReportsPage(props: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  if (session.user.role === "STAFF") {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground mt-2">You do not have permission to view reports.</p>
      </div>
    )
  }

  const { searchParams } = props
  const { from: fromParam, to: toParam } = await searchParams
  
  const year = new Date().getFullYear()
  const from = fromParam || `${year}-01-01`
  const to = toParam || new Date().toISOString().split("T")[0]

  const { company } = await requireCompany()
  
  const customers = await prisma.customer.findMany({
    where: { companyId: company.id, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  })

  // Fetch invoices for charts
  const invoices = await prisma.invoice.findMany({
    where: { companyId: company.id, deletedAt: null, status: { notIn: ["DRAFT", "CANCELLED"] } },
    select: {
      date: true,
      finalAmount: true,
      currency: true,
      exchangeRate: true,
      cgstAmount: true,
      sgstAmount: true,
      igstAmount: true,
      vatAmount: true,
      tdsAmount: true,
    },
    orderBy: { date: "asc" }
  })

  // Group by month
  const monthlyRevenue: Record<string, number> = {}
  let totalCgst = 0, totalSgst = 0, totalIgst = 0, totalVat = 0, totalTds = 0
  const currencyCount: Record<string, number> = {}

  invoices.forEach(inv => {
    // Revenue in INR equivalent
    const month = inv.date.toLocaleString('default', { month: 'short', year: 'numeric' })
    const inrValue = inv.finalAmount * inv.exchangeRate
    monthlyRevenue[month] = (monthlyRevenue[month] || 0) + inrValue

    totalCgst += inv.cgstAmount * inv.exchangeRate
    totalSgst += inv.sgstAmount * inv.exchangeRate
    totalIgst += inv.igstAmount * inv.exchangeRate
    totalVat += (inv.vatAmount || 0) * inv.exchangeRate
    totalTds += inv.tdsAmount * inv.exchangeRate

    currencyCount[inv.currency] = (currencyCount[inv.currency] || 0) + 1
  })

  const revenueData = Object.entries(monthlyRevenue).map(([month, revenue]) => ({ month, revenue }))
  const taxData = [
    { name: "CGST", value: totalCgst },
    { name: "SGST", value: totalSgst },
    { name: "IGST", value: totalIgst },
    { name: "VAT", value: totalVat },
    { name: "TDS", value: totalTds },
  ]
  const currencyData = Object.entries(currencyCount).map(([name, value]) => ({ name, value }))

  return (
    <div className="flex flex-col gap-10 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports & Dashboard</h1>
        <p className="text-gray-500 mt-1">Analytics and compliance exports for your business.</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <ReportsCharts 
          revenueData={revenueData}
          taxData={taxData}
          currencyData={currencyData}
        />
      </div>

      <Separator className="bg-white/10" />

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Standard Reports</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {reports.map((report) => (
            <Card key={report.type} className="glass border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-blue-500" />
                  {report.title}
                </CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Link href={`/api/reports/${report.type}?from=${from}&to=${to}`} target="_blank">
                  <Button variant="outline" size="sm" className="glass border-white/10 hover:bg-white/8">View JSON</Button>
                </Link>
                <Link
                  href={`/api/reports/${report.type}?from=${from}&to=${to}&format=csv`}
                  target="_blank"
                >
                  <Button size="sm" className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 text-white">CSV</Button>
                </Link>
                <Link
                  href={`/api/reports/${report.type}?from=${from}&to=${to}&format=pdf`}
                  target="_blank"
                >
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">PDF</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Separator className="bg-white/10" />

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Compliance Exports</h2>
        <ComplianceClient customers={customers} />
      </div>
    </div>
  )
}
