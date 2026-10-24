import { describe, it, expect } from "vitest"
import { customerSchema } from "@/validations/customer"
import { InvoiceDocument } from "@/pdf/invoice-document"
import { renderToBuffer } from "@react-pdf/renderer"

describe("Customer Contact Person Visibility Feature", () => {
  it("customerSchema validates showContactPersonName properly", () => {
    // Default / optional
    const resDefault = customerSchema.parse({
      name: "Kumar R",
      companyName: "RCS TECH LLP",
    })
    expect(resDefault.name).toBe("Kumar R")
    expect(resDefault.showContactPersonName).toBeUndefined()

    // Explicit true
    const resTrue = customerSchema.parse({
      name: "Kumar R",
      companyName: "RCS TECH LLP",
      showContactPersonName: true,
    })
    expect(resTrue.showContactPersonName).toBe(true)

    // Explicit false
    const resFalse = customerSchema.parse({
      name: "Kumar R",
      companyName: "RCS TECH LLP",
      showContactPersonName: false,
    })
    expect(resFalse.showContactPersonName).toBe(false)
  })

  const baseInvoice: any = {
    id: "inv-123",
    companyId: "comp-123",
    invoiceNumber: "INV-2026-0001",
    date: new Date("2026-10-01"),
    dueDate: new Date("2026-10-15"),
    currency: "INR",
    themeColor: "#1e40af",
    themeFont: "Helvetica",
    status: "PAID",
    subTotal: 40000,
    totalDiscount: 0,
    totalTax: 0,
    tdsPercentage: 10,
    tdsAmount: 4000,
    finalAmount: 40000,
    amountPaid: 40000,
    balanceDue: 0,
    company: {
      name: "My Tech Agency",
      address: "123 Main St",
      gstNumber: "29AAAAA0000A1Z5",
      subscriptionTier: "FREE",
    },
    items: [
      {
        id: "item-1",
        description: "Consulting",
        quantity: 1,
        unitPrice: 40000,
        taxPercentage: 0,
        taxableAmount: 40000,
        taxAmount: 0,
        discount: 0,
        total: 40000,
      },
    ],
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

  it("renders contact person name when showContactPersonName is true or undefined", async () => {
    const invoiceWithContact = {
      ...baseInvoice,
      customer: {
        name: "kumar",
        companyName: "RCS TECH LLP",
        address: "Bengaluru, Karnataka",
        showContactPersonName: true,
      },
    }

    const doc = InvoiceDocument({ invoice: invoiceWithContact })
    const textNodes = flattenReactTree(doc)
    expect(textNodes).toContain("KUMAR")
    expect(textNodes).toContain("RCS TECH LLP")

    const buffer = await renderToBuffer(doc)
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBeGreaterThan(0)
  })

  it("does NOT render contact person name when showContactPersonName is false", async () => {
    const invoiceWithoutContact = {
      ...baseInvoice,
      customer: {
        name: "kumar",
        companyName: "RCS TECH LLP",
        address: "Bengaluru, Karnataka",
        showContactPersonName: false,
      },
    }

    const doc = InvoiceDocument({ invoice: invoiceWithoutContact })
    const textNodes = flattenReactTree(doc)
    // Contact person name "kumar" / "KUMAR" must NOT be in the tree
    expect(textNodes).not.toContain("KUMAR")
    expect(textNodes).not.toContain("kumar")
    // Company name must be uppercase in primary place
    expect(textNodes).toContain("RCS TECH LLP")

    const buffer = await renderToBuffer(doc)
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBeGreaterThan(0)
  })

  it("works across all templates (classic, minimal, modern)", async () => {
    for (const template of ["classic", "minimal", "modern"] as const) {
      const invoice = {
        ...baseInvoice,
        company: {
          ...baseInvoice.company,
          pdfTemplate: template,
        },
        customer: {
          name: "kumar",
          companyName: "RCS TECH LLP",
          showContactPersonName: false,
        },
      }

      const doc = InvoiceDocument({ invoice })
      const textNodes = flattenReactTree(doc)
      expect(textNodes).not.toContain("KUMAR")
      expect(textNodes).toContain("RCS TECH LLP")

      const buffer = await renderToBuffer(doc)
      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.length).toBeGreaterThan(0)
    }
  })

  it("handles missing contact person name or missing company name gracefully", async () => {
    const invoiceNoCompany = {
      ...baseInvoice,
      customer: {
        name: "kumar",
        companyName: null,
        showContactPersonName: false,
      },
    }

    const doc = InvoiceDocument({ invoice: invoiceNoCompany })
    const textNodes = flattenReactTree(doc)
    expect(textNodes).not.toContain("KUMAR")

    const buffer = await renderToBuffer(doc)
    expect(buffer).toBeInstanceOf(Buffer)
  })
})
