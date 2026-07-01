import { NextRequest, NextResponse } from "next/server"
import { requireCompany } from "@/lib/auth-helpers"
import { getTenantDb } from "@/lib/tenant-db"
import { parseCatalogCsv, parseCustomerCsv } from "@/lib/import/csv-parser"
import type { ImportResult } from "@/lib/import/types"

/**
 * POST /api/import/bulk
 * Body: multipart/form-data
 *   - file: CSV file
 *   - type: "catalog" | "customers"
 */
export async function POST(req: NextRequest) {
  try {
    const { company } = await requireCompany()
    const db = await getTenantDb(company.id)

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const type = (formData.get("type") as string | null)?.toLowerCase()

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }
    if (type !== "catalog" && type !== "customers") {
      return NextResponse.json({ error: "type must be 'catalog' or 'customers'" }, { status: 400 })
    }

    const text = await file.text()

    const result: ImportResult = { inserted: 0, skipped: 0, errors: [] }

    // ── Catalog import ──────────────────────────────────────────────────
    if (type === "catalog") {
      const rows = parseCatalogCsv(text)

      if (rows.length === 0) {
        return NextResponse.json({ error: "CSV is empty or has no data rows" }, { status: 400 })
      }

      for (const row of rows) {
        if (row._errors && row._errors.length > 0) {
          result.errors.push({ row: row._row ?? 0, message: row._errors.join("; ") })
          result.skipped++
          continue
        }
        try {
          await db.productCatalog.create({
            data: {
              companyId:     company.id,
              name:          row.name,
              description:   row.description  ?? null,
              hsnSac:        row.hsnSac        ?? null,
              unitPrice:     row.unitPrice,
              taxPercentage: row.taxPercentage,
              unit:          row.unit          ?? null,
            },
          })
          result.inserted++
        } catch (err) {
          console.error("[import/bulk] catalog row error:", err)
          result.errors.push({ row: row._row ?? 0, message: "Database insert failed" })
          result.skipped++
        }
      }

      return NextResponse.json(result)
    }

    // ── Customer import ─────────────────────────────────────────────────
    if (type === "customers") {
      const rows = parseCustomerCsv(text)

      if (rows.length === 0) {
        return NextResponse.json({ error: "CSV is empty or has no data rows" }, { status: 400 })
      }

      for (const row of rows) {
        if (row._errors && row._errors.length > 0) {
          result.errors.push({ row: row._row ?? 0, message: row._errors.join("; ") })
          result.skipped++
          continue
        }
        try {
          // Check for duplicate by name + email within this company
          const existing = await db.customer.findFirst({
            where: {
              companyId: company.id,
              deletedAt: null,
              OR: [
                { name: row.name },
                ...(row.email ? [{ email: row.email }] : []),
              ],
            },
          })
          if (existing) {
            result.errors.push({ row: row._row ?? 0, message: `Duplicate: customer "${row.name}" already exists` })
            result.skipped++
            continue
          }

          await db.customer.create({
            data: {
              companyId:   company.id,
              name:        row.name,
              companyName: row.companyName ?? null,
              gstin:       row.gstin       ?? null,
              pan:         row.pan         ?? null,
              email:       row.email       ?? null,
              phone:       row.phone       ?? null,
              address:     row.address     ?? null,
              state:       row.state       ?? null,
              country:     row.country     ?? "India",
            },
          })
          result.inserted++
        } catch (err) {
          console.error("[import/bulk] customer row error:", err)
          result.errors.push({ row: row._row ?? 0, message: "Database insert failed" })
          result.skipped++
        }
      }

      return NextResponse.json(result)
    }

    return NextResponse.json({ error: "Unhandled type" }, { status: 400 })
  } catch (error) {
    console.error("[import/bulk] error:", error)
    return NextResponse.json({ error: "Import failed" }, { status: 500 })
  }
}
