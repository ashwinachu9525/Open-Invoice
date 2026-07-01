import type { InvoiceImportDraft, InvoiceImportItem } from "./types"

/**
 * OCR-based invoice parser using Google Gemini Vision API.
 * Re-uses the company's existing Gemini key from AISettings.
 */
export async function parseInvoiceViaOcr(
  imageBuffer: Buffer,
  mimeType: string,
  geminiApiKey: string
): Promise<InvoiceImportDraft> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai")
  const genAI = new GoogleGenerativeAI(geminiApiKey)
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

  const base64Image = imageBuffer.toString("base64")

  const prompt = `You are an invoice OCR extractor. Analyse this invoice image carefully and extract ALL data into the following JSON format. Return ONLY the JSON object, no explanation.

{
  "invoiceNumber": "string or null",
  "date": "YYYY-MM-DD or null",
  "dueDate": "YYYY-MM-DD or null",
  "currency": "INR or detected currency code",
  "sellerName": "string or null",
  "sellerGstin": "15-char GSTIN or null",
  "sellerAddress": "string or null",
  "sellerPhone": "string or null",
  "sellerEmail": "string or null",
  "buyerName": "string or null",
  "buyerCompanyName": "string or null",
  "buyerGstin": "15-char GSTIN or null",
  "buyerEmail": "string or null",
  "buyerPhone": "string or null",
  "buyerAddress": "string or null",
  "buyerState": "state name or null",
  "items": [
    {
      "description": "item description",
      "hsnSac": "HSN or SAC code or null",
      "quantity": 1,
      "unitPrice": 0,
      "discount": 0,
      "taxPercentage": 18,
      "total": 0
    }
  ],
  "subTotal": 0,
  "totalTax": 0,
  "totalDiscount": 0,
  "finalAmount": 0,
  "notes": "string or null",
  "terms": "string or null",
  "confidence": 0.9
}

Rules:
- All amounts must be numeric (no currency symbols, no commas)
- If a field is not visible or not applicable, use null
- Detect each line item separately
- confidence should reflect how readable/complete the invoice was (0.0 to 1.0)`

  const result = await model.generateContent([
    {
      inlineData: { data: base64Image, mimeType: mimeType as any },
    },
    prompt,
  ])

  const text = result.response.text().trim()

  // Strip markdown code fences if present
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim()

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return {
      source: "ocr",
      confidence: 0,
      items: [],
      parseWarnings: ["OCR returned unstructured text — could not parse JSON. Please fill in manually."],
    }
  }

  const warnings: string[] = []
  const items: InvoiceImportItem[] = []

  if (Array.isArray(parsed.items)) {
    for (const it of parsed.items as Record<string, unknown>[]) {
      items.push({
        description: String(it.description ?? "Item"),
        hsnSac: it.hsnSac ? String(it.hsnSac) : undefined,
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        discount: Number(it.discount) || 0,
        taxPercentage: Number(it.taxPercentage) ?? 18,
        total: Number(it.total) || undefined,
      })
    }
  }

  if (items.length === 0) {
    warnings.push("No line items detected — please add them manually.")
  }

  const confidence = Number(parsed.confidence) || 0.5
  if (confidence < 0.6) {
    warnings.push("Low OCR confidence — please review all fields carefully.")
  }

  return {
    source: "ocr",
    confidence,
    invoiceNumber:   parsed.invoiceNumber   ? String(parsed.invoiceNumber)   : undefined,
    date:            parsed.date            ? String(parsed.date)            : undefined,
    dueDate:         parsed.dueDate         ? String(parsed.dueDate)         : undefined,
    currency:        parsed.currency        ? String(parsed.currency)        : "INR",
    sellerName:      parsed.sellerName      ? String(parsed.sellerName)      : undefined,
    sellerGstin:     parsed.sellerGstin     ? String(parsed.sellerGstin)     : undefined,
    sellerAddress:   parsed.sellerAddress   ? String(parsed.sellerAddress)   : undefined,
    sellerPhone:     parsed.sellerPhone     ? String(parsed.sellerPhone)     : undefined,
    sellerEmail:     parsed.sellerEmail     ? String(parsed.sellerEmail)     : undefined,
    buyerName:       parsed.buyerName       ? String(parsed.buyerName)       : undefined,
    buyerCompanyName:parsed.buyerCompanyName? String(parsed.buyerCompanyName): undefined,
    buyerGstin:      parsed.buyerGstin      ? String(parsed.buyerGstin)      : undefined,
    buyerEmail:      parsed.buyerEmail      ? String(parsed.buyerEmail)      : undefined,
    buyerPhone:      parsed.buyerPhone      ? String(parsed.buyerPhone)      : undefined,
    buyerAddress:    parsed.buyerAddress    ? String(parsed.buyerAddress)    : undefined,
    buyerState:      parsed.buyerState      ? String(parsed.buyerState)      : undefined,
    subTotal:        parsed.subTotal        ? Number(parsed.subTotal)        : undefined,
    totalTax:        parsed.totalTax        ? Number(parsed.totalTax)        : undefined,
    totalDiscount:   parsed.totalDiscount   ? Number(parsed.totalDiscount)   : undefined,
    finalAmount:     parsed.finalAmount     ? Number(parsed.finalAmount)     : undefined,
    notes:           parsed.notes           ? String(parsed.notes)           : undefined,
    terms:           parsed.terms           ? String(parsed.terms)           : undefined,
    items,
    parseWarnings: warnings.length > 0 ? warnings : undefined,
  }
}
