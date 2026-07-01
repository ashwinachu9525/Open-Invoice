import type { CatalogImportRow, CustomerImportRow } from "./types"

// ── RFC-4180 CSV tokenizer ────────────────────────────────────────────────

/**
 * Parse a RFC-4180 CSV string into an array of row-objects.
 * Handles: quoted fields, escaped quotes (""), CRLF and LF line endings, BOM.
 */
function parseCsvToRows(text: string): string[][] {
  // Strip UTF-8 BOM
  const src = text.replace(/^\uFEFF/, "").trim()
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false
  let i = 0

  while (i < src.length) {
    const ch = src[i]
    const next = src[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        // Escaped quote
        field += '"'
        i += 2
      } else if (ch === '"') {
        inQuotes = false
        i++
      } else {
        field += ch
        i++
      }
    } else {
      if (ch === '"') {
        inQuotes = true
        i++
      } else if (ch === ',') {
        row.push(field)
        field = ""
        i++
      } else if (ch === '\r' && next === '\n') {
        row.push(field)
        rows.push(row)
        row = []
        field = ""
        i += 2
      } else if (ch === '\n' || ch === '\r') {
        row.push(field)
        rows.push(row)
        row = []
        field = ""
        i++
      } else {
        field += ch
        i++
      }
    }
  }

  // Flush last field / row
  if (field !== "" || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows.filter(r => r.some(c => c.trim() !== ""))
}

/** Normalise a header string for map lookup (lowercase, strip spaces/underscores) */
function normaliseHeader(h: string): string {
  return h.toLowerCase().replace(/[\s_\-()]+/g, "")
}

function buildHeaderMap(headers: string[]): Map<string, number> {
  const map = new Map<string, number>()
  for (let i = 0; i < headers.length; i++) {
    map.set(normaliseHeader(headers[i]), i)
  }
  return map
}

function get(row: string[], map: Map<string, number>, ...keys: string[]): string {
  for (const key of keys) {
    const idx = map.get(normaliseHeader(key))
    if (idx !== undefined && idx < row.length) {
      const val = row[idx]?.trim()
      if (val) return val
    }
  }
  return ""
}

function getNum(row: string[], map: Map<string, number>, fallback: number, ...keys: string[]): number {
  const raw = get(row, map, ...keys)
  const n = parseFloat(raw.replace(/,/g, ""))
  return isNaN(n) ? fallback : n
}

// ── Catalog CSV Parser ────────────────────────────────────────────────────

/** Expected headers (any order, case-insensitive):
 *  name, description, hsn_sac / hsnSac, unit_price / unitPrice,
 *  tax_percentage / taxPercentage, unit
 */
export function parseCatalogCsv(csvText: string): CatalogImportRow[] {
  const allRows = parseCsvToRows(csvText)
  if (allRows.length < 2) return []

  const headerRow = allRows[0]
  const map = buildHeaderMap(headerRow)
  const results: CatalogImportRow[] = []

  for (let i = 1; i < allRows.length; i++) {
    const row = allRows[i]
    const errors: string[] = []

    const name = get(row, map, "name", "product name", "item name", "service name")
    if (!name) errors.push("name is required")

    const unitPrice = getNum(row, map, NaN, "unit price", "unitprice", "price", "rate")
    if (isNaN(unitPrice)) errors.push("unit_price must be a number")

    const taxPct = getNum(row, map, 18, "tax percentage", "taxpercentage", "gst rate", "gstrate", "tax")

    results.push({
      name,
      description: get(row, map, "description", "desc") || undefined,
      hsnSac: get(row, map, "hsnsac", "hsn sac", "hsn/sac", "hsn", "sac") || undefined,
      unitPrice: isNaN(unitPrice) ? 0 : unitPrice,
      taxPercentage: taxPct,
      unit: get(row, map, "unit", "uom", "unit of measure") || undefined,
      _row: i + 1,
      _errors: errors.length > 0 ? errors : undefined,
    })
  }

  return results
}

// ── Customer CSV Parser ───────────────────────────────────────────────────

/** Expected headers (any order, case-insensitive):
 *  name, company_name, gstin, pan, email, phone, address, state, country
 */
export function parseCustomerCsv(csvText: string): CustomerImportRow[] {
  const allRows = parseCsvToRows(csvText)
  if (allRows.length < 2) return []

  const headerRow = allRows[0]
  const map = buildHeaderMap(headerRow)
  const results: CustomerImportRow[] = []

  for (let i = 1; i < allRows.length; i++) {
    const row = allRows[i]
    const errors: string[] = []

    const name = get(row, map, "name", "customer name", "contact name", "full name")
    if (!name) errors.push("name is required")

    const email = get(row, map, "email", "email address", "e-mail")
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push("invalid email address")
    }

    const gstin = get(row, map, "gstin", "gst number", "gstnumber", "gstin number")
    if (gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin.toUpperCase())) {
      errors.push("GSTIN format is invalid (should be 15-char like 27AAAAA0000A1Z5)")
    }

    results.push({
      name,
      companyName: get(row, map, "company name", "companyname", "business name", "firm name") || undefined,
      gstin: gstin?.toUpperCase() || undefined,
      pan: get(row, map, "pan", "pan number") || undefined,
      email: email || undefined,
      phone: get(row, map, "phone", "mobile", "phone number", "contact") || undefined,
      address: get(row, map, "address", "billing address") || undefined,
      state: get(row, map, "state", "billing state") || undefined,
      country: get(row, map, "country", "billing country") || "India",
      _row: i + 1,
      _errors: errors.length > 0 ? errors : undefined,
    })
  }

  return results
}

// ── CSV Template Generators ───────────────────────────────────────────────

export const CATALOG_CSV_TEMPLATE =
  "name,description,hsn_sac,unit_price,tax_percentage,unit\n" +
  "\"Web Design Service\",\"Full responsive website design\",998314,50000,18,project\n" +
  "\"SEO Consulting\",\"Monthly SEO management\",998314,15000,18,month\n"

export const CUSTOMER_CSV_TEMPLATE =
  "name,company_name,gstin,pan,email,phone,address,state,country\n" +
  "\"Ravi Kumar\",\"Ravi Enterprises\",27AAAAA0000A1Z5,AAAAA0000A,ravi@example.com,9876543210,\"123 MG Road Mumbai\",Maharashtra,India\n" +
  "\"Priya Shah\",\"Shah Trading Co.\",,,priya@example.com,9123456789,\"45 Park Street Delhi\",Delhi,India\n"
