import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import {
  generateGstReport,
  generateTdsReport,
  generateOutstandingReport,
  toCSV,
} from "@/services/reports"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user?.companyId) {
    return NextResponse.json({ error: "No company" }, { status: 400 })
  }

  const { type } = await params
  const { searchParams } = request.nextUrl
  const from = new Date(searchParams.get("from") ?? new Date(new Date().getFullYear(), 0, 1))
  const to = new Date(searchParams.get("to") ?? new Date())
  const format = searchParams.get("format") ?? "json"

  let data: Record<string, unknown>[]

  switch (type) {
    case "gst":
      data = await generateGstReport(user.companyId, from, to)
      break
    case "tds":
      data = await generateTdsReport(user.companyId, from, to)
      break
    case "outstanding":
      data = await generateOutstandingReport(user.companyId)
      break
    default:
      return NextResponse.json({ error: "Invalid report type" }, { status: 400 })
  }

  if (format === "pdf") {
    const { generateReportPdf } = await import("@/services/pdf-report")
    const pdfStream = await generateReportPdf(`${type.toUpperCase()} Report`, data)
    return new NextResponse(pdfStream as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${type}-report.pdf"`,
      },
    })
  }

  if (format === "csv") {
    return new NextResponse(toCSV(data), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${type}-report.csv"`,
      },
    })
  }

  return NextResponse.json(data)
}
