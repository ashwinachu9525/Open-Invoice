// ── Shared types for Import / Export system ────────────────────────────────

export interface CatalogImportRow {
  name: string
  description?: string
  hsnSac?: string
  unitPrice: number
  taxPercentage: number
  unit?: string
  // validation metadata
  _row?: number
  _errors?: string[]
}

export interface CustomerImportRow {
  name: string
  companyName?: string
  gstin?: string
  pan?: string
  email?: string
  phone?: string
  address?: string
  state?: string
  country?: string
  // validation metadata
  _row?: number
  _errors?: string[]
}

export interface InvoiceImportDraft {
  /** Source format the draft was parsed from */
  source: "ocr" | "xml" | "json"
  /** Confidence score 0-1 for OCR, 1 for structured formats */
  confidence?: number

  // ── Header fields ────────────────────────────────────────────
  invoiceNumber?: string
  date?: string          // ISO date string
  dueDate?: string       // ISO date string
  currency?: string

  // ── Seller / Company ─────────────────────────────────────────
  sellerName?: string
  sellerGstin?: string
  sellerAddress?: string
  sellerPhone?: string
  sellerEmail?: string

  // ── Buyer / Customer ─────────────────────────────────────────
  buyerName?: string
  buyerCompanyName?: string
  buyerGstin?: string
  buyerEmail?: string
  buyerPhone?: string
  buyerAddress?: string
  buyerState?: string

  // ── Line Items ───────────────────────────────────────────────
  items: InvoiceImportItem[]

  // ── Totals (informational, recomputed on create) ─────────────
  subTotal?: number
  totalTax?: number
  totalDiscount?: number
  finalAmount?: number

  // ── Notes ────────────────────────────────────────────────────
  notes?: string
  terms?: string

  // ── Parse metadata ───────────────────────────────────────────
  parseWarnings?: string[]
}

export interface InvoiceImportItem {
  description: string
  hsnSac?: string
  quantity: number
  unitPrice: number
  discount?: number
  taxPercentage?: number
  total?: number
}

export interface ImportResult {
  inserted: number
  skipped: number
  errors: Array<{ row: number; message: string }>
}
