import { describe, it, expect, vi } from "vitest"
import {
  generateVerificationToken,
  buildCanonicalManifest,
  serializeManifest,
  generateInvoiceSignature,
  verifyInvoiceSignature,
  calculatePdfHash,
  verifyPdfHash,
  getInvoiceVerificationUrl,
  getBaseVerificationUrl,
  verifyInvoiceRecord,
} from "@/lib/invoice-verification"
import { InvoiceDocument } from "@/pdf/invoice-document"
import { renderToBuffer } from "@react-pdf/renderer"
import QRCode from "qrcode"

describe("Invoice Verification Security & Cryptography", () => {
  const sampleInvoice: any = {
    id: "inv_cl1234567890",
    invoiceNumber: "INV-2026-001",
    companyId: "comp_12345",
    company: {
      id: "comp_12345",
      name: "Acme Issuer Solutions Ltd",
      gstNumber: "29AAAAA0000A1Z5",
      email: "billing@acme.com",
      address: "123 Tech Park, Bangalore",
    },
    customer: {
      id: "cust_999",
      name: "Global Enterprises Inc",
      companyName: "Global Enterprises Inc",
      gstin: "29BBBBB1111B1Z2",
      address: "456 Commerce Blvd",
    },
    date: new Date("2026-10-24T00:00:00.000Z"),
    dueDate: new Date("2026-11-24T00:00:00.000Z"),
    currency: "INR",
    subTotal: 10000.0,
    totalTax: 1800.0,
    finalAmount: 11800.0,
    totalDiscount: 0,
    balanceDue: 11800.0,
    amountPaid: 0,
    cgstAmount: 900.0,
    sgstAmount: 900.0,
    igstAmount: 0,
    vatAmount: 0,
    status: "SENT",
    paymentCollectionMethod: "OFFLINE",
    items: [
      {
        id: "item_1",
        description: "Cloud Architecture Consulting",
        quantity: 10,
        unitPrice: 1000,
        taxPercentage: 18,
        total: 10000,
        hsnSac: "998311",
      },
    ],
    verificationToken: "sample-token-12345",
    pdfHash: calculatePdfHash(Buffer.from("sample-invoice-document")),
  }

  function flattenReactTree(node: any): any[] {
    if (!node) return []
    if (typeof node === "string" || typeof node === "number") return [String(node)]
    const result: any[] = []
    if (node.props?.children) {
      if (Array.isArray(node.props.children)) {
        for (const child of node.props.children) {
          result.push(...flattenReactTree(child))
        }
      } else {
        result.push(...flattenReactTree(node.props.children))
      }
    }
    return result
  }

  it("should generate cryptographically random 32-char hex verification tokens", () => {
    const token1 = generateVerificationToken()
    const token2 = generateVerificationToken()

    expect(token1).toHaveLength(32)
    expect(token2).toHaveLength(32)
    expect(token1).not.toBe(token2)
  })

  it("should build a deterministic canonical manifest for an invoice", () => {
    const manifest = buildCanonicalManifest(sampleInvoice)

    expect(manifest.invoiceId).toBe("inv_cl1234567890")
    expect(manifest.invoiceNumber).toBe("INV-2026-001")
    expect(manifest.companyId).toBe("comp_12345")
    expect(manifest.companyGst).toBe("29AAAAA0000A1Z5")
    expect(manifest.date).toBe("2026-10-24")
    expect(manifest.dueDate).toBe("2026-11-24")
    expect(manifest.currency).toBe("INR")
    expect(manifest.subTotal).toBe("10000.00")
    expect(manifest.totalTax).toBe("1800.00")
    expect(manifest.finalAmount).toBe("11800.00")
    expect(manifest.customerIdentifier).toBe("29BBBBB1111B1Z2")
    expect(manifest.itemsHash).toBeDefined()
  })

  it("should produce consistent signatures for identical manifests", () => {
    const manifest1 = buildCanonicalManifest(sampleInvoice)
    const manifest2 = buildCanonicalManifest(sampleInvoice)

    const sig1 = generateInvoiceSignature(manifest1)
    const sig2 = generateInvoiceSignature(manifest2)

    expect(sig1).toBe(sig2)
    expect(verifyInvoiceSignature(manifest1, sig1)).toBe(true)
  })

  it("should detect unauthorized modifications to invoice amount (tampering)", () => {
    const manifest = buildCanonicalManifest(sampleInvoice)
    const signature = generateInvoiceSignature(manifest)

    // Attacker modifies the final amount from 11800.00 to 500.00
    const tamperedInvoice = {
      ...sampleInvoice,
      finalAmount: 500.0,
    }
    const tamperedManifest = buildCanonicalManifest(tamperedInvoice)

    expect(verifyInvoiceSignature(tamperedManifest, signature)).toBe(false)
  })

  it("should detect unauthorized modifications to line items (tampering)", () => {
    const manifest = buildCanonicalManifest(sampleInvoice)
    const signature = generateInvoiceSignature(manifest)

    // Attacker modifies line item description or price
    const tamperedInvoice = {
      ...sampleInvoice,
      items: [
        {
          description: "Fake Modified Item",
          quantity: 10,
          unitPrice: 1000,
          total: 10000,
        },
      ],
    }
    const tamperedManifest = buildCanonicalManifest(tamperedInvoice)

    expect(verifyInvoiceSignature(tamperedManifest, signature)).toBe(false)
  })

  it("should detect forged signatures", () => {
    const manifest = buildCanonicalManifest(sampleInvoice)
    const forgedSignature = "0".repeat(64)

    expect(verifyInvoiceSignature(manifest, forgedSignature)).toBe(false)
  })

  it("should calculate and verify PDF SHA-256 document hashes", () => {
    const originalPdfBuffer = Buffer.from("%PDF-1.4 sample authoritative invoice document content")
    const hash = calculatePdfHash(originalPdfBuffer)

    expect(hash).toHaveLength(64) // SHA-256 hex length
    expect(verifyPdfHash(originalPdfBuffer, hash)).toBe(true)

    // Altered PDF content (even 1 character changed)
    const alteredPdfBuffer = Buffer.from("%PDF-1.4 sample authoritative invoice document CONTeNT")
    expect(verifyPdfHash(alteredPdfBuffer, hash)).toBe(false)
  })

  it("should generate a secure verification URL with signature", () => {
    const url = getInvoiceVerificationUrl(sampleInvoice)

    expect(url).toContain("/verify/sample-token-12345?sig=")
    const parsed = new URL(url)
    expect(parsed.pathname).toBe("/verify/sample-token-12345")
    const sig = parsed.searchParams.get("sig")
    expect(sig).toBeTruthy()

    // Validate that the signature in the generated URL is valid for the invoice
    const manifest = buildCanonicalManifest(sampleInvoice)
    expect(verifyInvoiceSignature(manifest, sig!)).toBe(true)
  })

  it("should fallback to invoice id if verificationToken is not set", () => {
    const invoiceWithoutToken = {
      ...sampleInvoice,
      verificationToken: null,
    }
    const url = getInvoiceVerificationUrl(invoiceWithoutToken)
    expect(url).toContain(`/verify/${sampleInvoice.id}?sig=`)
  })

  it("should embed secure verification URL in QR code instead of raw JSON", async () => {
    const verificationUrl = getInvoiceVerificationUrl(sampleInvoice)
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, { width: 140, margin: 1 })

    // Verify it is a valid data URL
    expect(qrCodeDataUrl).toMatch(/^data:image\/png;base64,/)

    // Render InvoiceDocument with verification QR code
    const doc = InvoiceDocument({
      invoice: sampleInvoice,
      verificationQrCodeDataUrl: qrCodeDataUrl,
    })

    const textNodes = flattenReactTree(doc)
    expect(textNodes).toContain("VERIFY INVOICE")
    expect(textNodes).toContain("Scan to verify authenticity")

    // The generated PDF should render into a valid binary buffer
    const buffer = await renderToBuffer(doc)
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBeGreaterThan(1000)

    // Computing hash of rendered PDF
    const hash = calculatePdfHash(buffer)
    expect(hash).toHaveLength(64)
  })

  it("should support both verification QR and payment QR when UPI is enabled", async () => {
    const verificationUrl = getInvoiceVerificationUrl(sampleInvoice)
    const verifyQr = await QRCode.toDataURL(verificationUrl, { width: 140, margin: 1 })
    const paymentQr = await QRCode.toDataURL("upi://pay?pa=test@upi&pn=Acme&am=11800.00&cu=INR", { width: 120, margin: 1 })

    const upiInvoice = {
      ...sampleInvoice,
      paymentCollectionMethod: "UPI_QR",
      vpaAddress: "test@upi",
    }

    const doc = InvoiceDocument({
      invoice: upiInvoice,
      verificationQrCodeDataUrl: verifyQr,
      paymentQrCodeDataUrl: paymentQr,
    })

    const textNodes = flattenReactTree(doc)
    expect(textNodes).toContain("VERIFY INVOICE")
    expect(textNodes).toContain("SCAN TO PAY")
    expect(textNodes).toContain("UPI QR Payment")
  })
})
