import type { InvoiceImportDraft, InvoiceImportItem } from "./types"

// ── Helpers ───────────────────────────────────────────────────────────────

function parseDate(raw: string): string | undefined {
  if (!raw) return undefined
  // Try DD/MM/YYYY or YYYY-MM-DD
  const ddmm = raw.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/)
  if (ddmm) return `${ddmm[3]}-${ddmm[2]}-${ddmm[1]}`
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return iso[0]
  return undefined
}

// ── GST e-Invoice JSON/XML Parser ─────────────────────────────────────────
// Supports the IRN JSON format used by GSTN NIC portal

function parseEInvoiceJson(data: Record<string, unknown>): InvoiceImportDraft {
  const warnings: string[] = []
  const items: InvoiceImportItem[] = []

  // Navigate the nested e-Invoice structure
  const docDtls = (data.DocDtls ?? {}) as Record<string, unknown>
  const sellerDtls = (data.SellerDtls ?? {}) as Record<string, unknown>
  const buyerDtls = (data.BuyerDtls ?? {}) as Record<string, unknown>
  const itemList = Array.isArray(data.ItemList) ? data.ItemList as Record<string, unknown>[] : []
  const valDtls = (data.ValDtls ?? {}) as Record<string, unknown>

  for (const it of itemList) {
    items.push({
      description: String(it.PrdDesc ?? it.Desc ?? "Item"),
      hsnSac:      it.HsnCd ? String(it.HsnCd) : undefined,
      quantity:    Number(it.Qty) || 1,
      unitPrice:   Number(it.UnitPrice ?? it.UnitVal) || 0,
      discount:    Number(it.Discount) || 0,
      taxPercentage: Number(it.GstRt) || 18,
      total:       Number(it.TotItemVal) || undefined,
    })
  }

  if (items.length === 0) {
    // Try alternate field names
    const altItems = Array.isArray(data.items) ? data.items as Record<string, unknown>[] : []
    for (const it of altItems) {
      items.push({
        description: String(it.description ?? it.PrdDesc ?? "Item"),
        hsnSac:      it.hsnSac ?? it.HsnCd ? String(it.hsnSac ?? it.HsnCd) : undefined,
        quantity:    Number(it.quantity ?? it.Qty) || 1,
        unitPrice:   Number(it.unitPrice ?? it.UnitPrice) || 0,
        discount:    Number(it.discount ?? it.Discount) || 0,
        taxPercentage: Number(it.taxPercentage ?? it.GstRt) || 18,
        total:       Number(it.total ?? it.TotItemVal) || undefined,
      })
    }
  }

  return {
    source: "json",
    confidence: 1,
    invoiceNumber:   String(docDtls.No  ?? data.invoiceNumber ?? ""),
    date:            parseDate(String(docDtls.Dt  ?? data.date ?? "")),
    dueDate:         parseDate(String(data.dueDate ?? "")),
    currency:        String(docDtls.Curr ?? data.currency ?? "INR"),
    sellerName:      String(sellerDtls.LglNm ?? sellerDtls.TrdNm ?? data.sellerName ?? ""),
    sellerGstin:     String(sellerDtls.Gstin ?? data.sellerGstin ?? ""),
    sellerAddress:   String(sellerDtls.Addr1 ?? data.sellerAddress ?? ""),
    sellerPhone:     String(sellerDtls.Ph ?? data.sellerPhone ?? ""),
    sellerEmail:     String(sellerDtls.Em ?? data.sellerEmail ?? ""),
    buyerName:       String(buyerDtls.LglNm ?? buyerDtls.TrdNm ?? data.buyerName ?? ""),
    buyerCompanyName:String(buyerDtls.TrdNm ?? data.buyerCompanyName ?? ""),
    buyerGstin:      String(buyerDtls.Gstin ?? data.buyerGstin ?? ""),
    buyerEmail:      String(buyerDtls.Em ?? data.buyerEmail ?? ""),
    buyerPhone:      String(buyerDtls.Ph ?? data.buyerPhone ?? ""),
    buyerAddress:    String(buyerDtls.Addr1 ?? data.buyerAddress ?? ""),
    buyerState:      String(buyerDtls.Stcd ?? buyerDtls.State ?? data.buyerState ?? ""),
    subTotal:        Number(valDtls.AssVal ?? data.subTotal)   || undefined,
    totalTax:        Number(valDtls.TotInvVal ?? data.totalTax) || undefined,
    finalAmount:     Number(valDtls.TotInvVal ?? data.finalAmount) || undefined,
    notes:           String(data.notes ?? ""),
    terms:           String(data.terms ?? ""),
    items,
    parseWarnings: warnings.length > 0 ? warnings : undefined,
  }
}

// ── UBL 2.1 XML Parser (pure regex — no external packages) ───────────────
function parseUblXml(xmlText: string): InvoiceImportDraft {
  const warnings: string[] = []
  const items: InvoiceImportItem[] = []

  /** Extract first text content of a tag (with optional namespace prefix) */
  function rx(tag: string): string {
    // Matches both <Tag> and <ns:Tag> or <cbc:Tag>
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const m = xmlText.match(new RegExp(`<(?:[a-zA-Z]+:)?${escaped}[^>]*>([^<]*)<\\/(?:[a-zA-Z]+:)?${escaped}>`, "i"))
    return m ? m[1].trim() : ""
  }

  /** Extract text of a tag found inside a parent block */
  function rxIn(block: string, tag: string): string {
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const m = block.match(new RegExp(`<(?:[a-zA-Z]+:)?${escaped}[^>]*>([^<]*)<\\/(?:[a-zA-Z]+:)?${escaped}>`, "i"))
    return m ? m[1].trim() : ""
  }

  // Extract line items
  const linePattern = /<(?:[a-zA-Z]+:)?InvoiceLine[^>]*>([\s\S]*?)<\/(?:[a-zA-Z]+:)?InvoiceLine>/gi
  const lineBlocks = [...xmlText.matchAll(linePattern)]
  for (const block of lineBlocks) {
    const inner = block[1]
    const desc  = rxIn(inner, "Description") || rxIn(inner, "Name") || "Item"
    const qty   = parseFloat(rxIn(inner, "InvoicedQuantity") || "1")
    const price = parseFloat(rxIn(inner, "PriceAmount") || "0")
    const total = parseFloat(rxIn(inner, "LineExtensionAmount") || "0")
    const taxPct= parseFloat(rxIn(inner, "Percent") || "18")
    const hsn   = rxIn(inner, "CommodityClassification") || undefined
    items.push({ description: desc, quantity: qty, unitPrice: price, taxPercentage: taxPct, total: total || undefined, hsnSac: hsn })
  }

  if (items.length === 0) warnings.push("No line items detected — please add them manually.")

  return {
    source: "xml",
    confidence: items.length > 0 ? 0.9 : 0.5,
    invoiceNumber: rx("ID"),
    date:          parseDate(rx("IssueDate")),
    dueDate:       parseDate(rx("DueDate")),
    currency:      rx("DocumentCurrencyCode"),
    sellerName:    rx("AccountingSupplierParty") || rx("SellerPartyName"),
    buyerName:     rx("AccountingCustomerParty") || rx("BuyerPartyName"),
    finalAmount:   parseFloat(rx("PayableAmount")) || undefined,
    subTotal:      parseFloat(rx("TaxExclusiveAmount") || rx("LineExtensionAmount")) || undefined,
    items,
    parseWarnings: warnings.length > 0 ? warnings : undefined,
  }
}


// ── GST e-Invoice XML (NIC format) ────────────────────────────────────────
function parseEInvoiceXml(xmlText: string): InvoiceImportDraft {
  // NIC e-Invoice XML looks like JSON wrapped in XML — try extracting JSON first
  const jsonMatch = xmlText.match(/<Data[^>]*>([\s\S]+?)<\/Data>/i)
  if (jsonMatch) {
    try {
      const inner = JSON.parse(jsonMatch[1].trim()) as Record<string, unknown>
      return parseEInvoiceJson(inner)
    } catch {/* fall through */}
  }
  // Otherwise treat as UBL
  return parseUblXml(xmlText)
}

// ── Public API ────────────────────────────────────────────────────────────

export function parseInvoiceXml(xmlText: string): InvoiceImportDraft {
  // Detect format by namespace / root element
  if (xmlText.includes("urn:oasis:names:specification:ubl") || xmlText.includes("<Invoice") && xmlText.includes("cbc:")) {
    return parseUblXml(xmlText)
  }
  return parseEInvoiceXml(xmlText)
}

export function parseInvoiceJson(jsonText: string): InvoiceImportDraft {
  let data: Record<string, unknown>
  try {
    data = JSON.parse(jsonText) as Record<string, unknown>
  } catch {
    return {
      source: "json",
      confidence: 0,
      items: [],
      parseWarnings: ["Invalid JSON — could not parse the file."],
    }
  }
  return parseEInvoiceJson(data)
}
