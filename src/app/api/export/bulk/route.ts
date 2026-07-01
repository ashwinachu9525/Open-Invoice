import { NextRequest, NextResponse } from "next/server"
import { requireCompany } from "@/lib/auth-helpers"
import { getTenantDb } from "@/lib/tenant-db"
import {
  buildCatalogCsv,
  buildCustomerCsv,
  buildInvoicesCsv,
  buildInvoicesJson,
  buildInvoicesXml,
} from "@/lib/export/csv-builder"

/**
 * GET /api/export/bulk
 * ?type=catalog|customers|invoices
 * &format=csv|json|xml          (invoices only — csv/json/xml; catalog & customers always csv)
 * &from=YYYY-MM-DD              (invoices: optional date range)
 * &to=YYYY-MM-DD
 */
export async function GET(req: NextRequest) {
  try {
    const { company } = await requireCompany()
    const db = await getTenantDb(company.id)
    const sp = req.nextUrl.searchParams

    const type   = sp.get("type")   ?? "catalog"
    const format = sp.get("format") ?? "csv"
    const from   = sp.get("from")
    const to     = sp.get("to")

    const now = new Date().toISOString().split("T")[0]

    // ── Catalog export ────────────────────────────────────────────────────
    if (type === "catalog") {
      const items = await db.productCatalog.findMany({
        where: { companyId: company.id, deletedAt: null },
        orderBy: { name: "asc" },
      })
      const csv = buildCatalogCsv(items)
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="catalog_${now}.csv"`,
        },
      })
    }

    // ── Customer export ───────────────────────────────────────────────────
    if (type === "customers") {
      const customers = await db.customer.findMany({
        where: { companyId: company.id, deletedAt: null },
        orderBy: { name: "asc" },
      })
      const csv = buildCustomerCsv(customers)
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="customers_${now}.csv"`,
        },
      })
    }

    // ── Invoice export ────────────────────────────────────────────────────
    if (type === "invoices") {
      const dateFilter = from || to ? {
        date: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to   ? { lte: new Date(to + "T23:59:59") } : {}),
        },
      } : {}

      const invoices = await db.invoice.findMany({
        where: { companyId: company.id, deletedAt: null, ...dateFilter },
        include: { customer: true, items: true },
        orderBy: { date: "desc" },
      })

      if (format === "json") {
        const json = buildInvoicesJson(invoices)
        return new NextResponse(json, {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Disposition": `attachment; filename="invoices_${now}.json"`,
          },
        })
      }

      if (format === "xml") {
        const xml = buildInvoicesXml(invoices)
        return new NextResponse(xml, {
          status: 200,
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Content-Disposition": `attachment; filename="invoices_${now}.xml"`,
          },
        })
      }

      // Default: CSV summary
      const csv = buildInvoicesCsv(invoices)
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="invoices_${now}.csv"`,
        },
      })
    }

    return NextResponse.json({ error: "Invalid type parameter. Use: catalog | customers | invoices" }, { status: 400 })
  } catch (error) {
    console.error("[export/bulk] error:", error)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}
