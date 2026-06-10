import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { FileSpreadsheet } from "lucide-react"

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

export default function ReportsPage() {
  const year = new Date().getFullYear()
  const from = `${year}-01-01`
  const to = new Date().toISOString().split("T")[0]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-gray-500">Generate and export business reports</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {reports.map((report) => (
          <Card key={report.type}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                {report.title}
              </CardTitle>
              <CardDescription>{report.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Link href={`/api/reports/${report.type}?from=${from}&to=${to}`} target="_blank">
                <Button variant="outline" size="sm">View JSON</Button>
              </Link>
              <Link
                href={`/api/reports/${report.type}?from=${from}&to=${to}&format=csv`}
                target="_blank"
              >
                <Button size="sm">Export CSV</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
