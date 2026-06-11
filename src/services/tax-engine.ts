export interface LineItemInput {
  description: string
  hsnSac?: string
  quantity: number
  unitPrice: number
  discount: number
  taxPercentage: number
}

export interface LineItemResult extends LineItemInput {
  taxableAmount: number
  taxAmount: number
  total: number
}

export interface TaxBreakdown {
  subTotal: number
  totalDiscount: number
  taxableAmount: number
  totalTax: number
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
  vatAmount: number
  tdsPercentage: number
  tdsAmount: number
  finalAmount: number
  isInterState: boolean
  items: LineItemResult[]
}

const INDIAN_STATES = new Set([
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry", "Chandigarh",
  "Andaman and Nicobar Islands", "Dadra and Nagar Haveli and Daman and Diu",
  "Lakshadweep",
])

export function normalizeState(state?: string | null): string | null {
  if (!state) return null
  const trimmed = state.trim()
  for (const s of INDIAN_STATES) {
    if (s.toLowerCase() === trimmed.toLowerCase()) return s
  }
  return trimmed
}

export function isInterState(sellerState?: string | null, buyerState?: string | null): boolean {
  const seller = normalizeState(sellerState)
  const buyer = normalizeState(buyerState)
  if (!seller || !buyer) return false
  return seller.toLowerCase() !== buyer.toLowerCase()
}

export function calculateLineItem(item: LineItemInput): LineItemResult {
  const gross = item.quantity * item.unitPrice
  const taxableAmount = Math.max(0, gross - item.discount)
  const taxAmount = round2(taxableAmount * (item.taxPercentage / 100))
  const total = round2(taxableAmount + taxAmount)

  return {
    ...item,
    taxableAmount: round2(taxableAmount),
    taxAmount,
    total,
  }
}

export function calculateInvoiceTax(params: {
  items: LineItemInput[]
  sellerState?: string | null
  buyerState?: string | null
  tdsPercentage?: number
  taxJurisdiction?: string
}): TaxBreakdown {
  const items = params.items.map(calculateLineItem)
  const subTotal = round2(items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0))
  const totalDiscount = round2(items.reduce((sum, i) => sum + i.discount, 0))
  const taxableAmount = round2(items.reduce((sum, i) => sum + i.taxableAmount, 0))
  let totalTax = round2(items.reduce((sum, i) => sum + i.taxAmount, 0))

  const jurisdiction = params.taxJurisdiction || "INDIA_GST"
  if (jurisdiction === "NONE") {
    totalTax = 0
    items.forEach(i => i.taxAmount = 0)
  }

  const interState = isInterState(params.sellerState, params.buyerState)

  let cgstAmount = 0
  let sgstAmount = 0
  let igstAmount = 0
  let vatAmount = 0

  if (jurisdiction === "INDIA_GST") {
    if (interState) {
      igstAmount = totalTax
    } else {
      cgstAmount = round2(totalTax / 2)
      sgstAmount = round2(totalTax - cgstAmount)
    }
  } else if (jurisdiction === "EU_VAT" || jurisdiction === "US_SALES_TAX") {
    vatAmount = totalTax
  }

  const tdsPercentage = params.tdsPercentage ?? 0
  const tdsAmount = round2(taxableAmount * (tdsPercentage / 100))
  const finalAmount = round2(taxableAmount + totalTax - tdsAmount)

  return {
    subTotal,
    totalDiscount,
    taxableAmount,
    totalTax,
    cgstAmount,
    sgstAmount,
    igstAmount,
    vatAmount,
    tdsPercentage,
    tdsAmount,
    finalAmount,
    isInterState: interState,
    items,
  }
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function formatINR(amount: number): string {
  return formatCurrency(amount, "INR")
}

export function formatCurrency(amount: number, currencyCode: string = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(amount)
}

export const TDS_RATES = [0, 1, 2, 5, 10] as const
