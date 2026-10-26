import { describe, it, expect } from "vitest"
import {
  buildModernInvoiceEmailHtml,
  buildModernQuotationEmailHtml,
  buildModernPaymentReceiptEmailHtml,
  buildModernCampaignEmailHtml,
  buildModernEmailShell,
  formatEmailCurrency,
  formatEmailDate,
} from "@/services/email-templates"

describe("Email Templates Service", () => {
  describe("Formatting Helpers", () => {
    it("formats currency correctly for INR and other currencies", () => {
      const inrFormatted = formatEmailCurrency(45000, "INR")
      expect(inrFormatted).toContain("45,000")

      const usdFormatted = formatEmailCurrency(1250.5, "USD")
      expect(usdFormatted).toContain("1,250.5")

      const zeroFormatted = formatEmailCurrency(0, "INR")
      expect(zeroFormatted).toContain("0")
    })

    it("formats dates gracefully", () => {
      const testDate = new Date("2026-11-15T00:00:00.000Z")
      const formatted = formatEmailDate(testDate)
      expect(formatted).toContain("2026")
      expect(formatted).toContain("Nov")

      expect(formatEmailDate(null)).toBe("—")
      expect(formatEmailDate(undefined)).toBe("—")
      expect(formatEmailDate("invalid-date")).toBe("—")
    })
  })

  describe("buildModernEmailShell", () => {
    it("renders modern responsive shell with top gradient and branding", () => {
      const html = buildModernEmailShell({
        title: "Test Notification",
        badgeText: "VERIFIED",
        badgeColor: "emerald",
        companyName: "Acme Corp",
        contentHtml: "<p>Hello world!</p>",
      })

      expect(html).toContain("<!DOCTYPE html>")
      expect(html).toContain("linear-gradient(90deg, #4f46e5 0%, #7c3aed 50%, #06b6d4 100%)")
      expect(html).toContain("Acme Corp")
      expect(html).toContain("VERIFIED")
      expect(html).toContain("Hello world!")
      expect(html).toContain("Sent via")
    })

    it("displays 'Open Invoice' in copyright footer when showCompanyInEmailFooter is false", () => {
      const currentYear = new Date().getFullYear()
      const html = buildModernEmailShell({
        title: "Test Notification",
        companyName: "Acme Client Corp",
        contentHtml: "<p>Hello</p>",
        showCompanyInEmailFooter: false,
      })

      expect(html).toContain(`&copy; ${currentYear} Open Invoice. All rights reserved.`)
      expect(html).not.toContain(`&copy; ${currentYear} Acme Client Corp. All rights reserved.`)
    })

    it("displays Company Name in copyright footer when showCompanyInEmailFooter is true", () => {
      const currentYear = new Date().getFullYear()
      const html = buildModernEmailShell({
        title: "Test Notification",
        companyName: "Acme Client Corp",
        contentHtml: "<p>Hello</p>",
        showCompanyInEmailFooter: true,
      })

      expect(html).toContain(`&copy; ${currentYear} Acme Client Corp. All rights reserved.`)
    })
  })

  describe("buildModernInvoiceEmailHtml", () => {
    it("renders attractive modern invoice layout with balance due, CTA, and attachment notice", () => {
      const invoiceData = {
        id: "inv-123",
        invoiceNumber: "INV-2026-001",
        date: new Date("2026-10-26"),
        dueDate: new Date("2026-11-26"),
        currency: "INR",
        subTotal: 50000,
        totalTax: 9000,
        totalDiscount: 1000,
        finalAmount: 58000,
        balanceDue: 58000,
        status: "SENT",
        bankName: "HDFC Bank",
        bankAccountNumber: "9876543210",
        bankIfscCode: "HDFC0001234",
      }

      const companyData = {
        name: "Zenith Solutions",
        email: "billing@zenith.com",
        phone: "+91 98765 43210",
        logo: null,
      }

      const customerData = {
        name: "Rahul Verma",
        companyName: "Verma Enterprises",
        email: "rahul@verma.com",
      }

      const html = buildModernInvoiceEmailHtml({
        invoice: invoiceData,
        company: companyData,
        customer: customerData,
        appUrl: "https://open-invoice.example.com",
      })

      expect(html).toContain("Invoice INV-2026-001")
      expect(html).toContain("Zenith Solutions")
      expect(html).toContain("Rahul Verma")
      expect(html).toContain("Verma Enterprises")
      expect(html).toContain("AMOUNT DUE")
      expect(html).toContain("View & Pay Invoice Online")
      expect(html).toContain("https://open-invoice.example.com/p/invoice/inv-123")
      expect(html).toContain("INV-2026-001.pdf")
      expect(html).toContain("HDFC Bank")
      expect(html).toContain("HDFC0001234")
    })

    it("renders paid status when balanceDue is 0", () => {
      const html = buildModernInvoiceEmailHtml({
        invoice: {
          id: "inv-paid-1",
          invoiceNumber: "INV-PAID-001",
          date: new Date("2026-10-26"),
          dueDate: new Date("2026-11-26"),
          currency: "INR",
          finalAmount: 25000,
          balanceDue: 0,
          amountPaid: 25000,
          status: "PAID",
        },
        company: { name: "Test Corp" },
        customer: { name: "Client A" },
        appUrl: "https://open-invoice.example.com",
      })

      expect(html).toContain("TOTAL PAID")
      expect(html).toContain("Paid in Full")
      expect(html).toContain("View Invoice Details")
    })

    it("respects showCompanyInEmailFooter configuration in invoice emails", () => {
      const currentYear = new Date().getFullYear()

      // Default: OFF -> shows Open Invoice
      const htmlOff = buildModernInvoiceEmailHtml({
        invoice: {
          id: "inv-1",
          invoiceNumber: "INV-001",
          date: new Date(),
          dueDate: new Date(),
          finalAmount: 1000,
        },
        company: { name: "Client Corp XYZ", showCompanyInEmailFooter: false },
        customer: { name: "Customer 1" },
      })
      expect(htmlOff).toContain(`&copy; ${currentYear} Open Invoice. All rights reserved.`)
      expect(htmlOff).not.toContain(`&copy; ${currentYear} Client Corp XYZ. All rights reserved.`)

      // Enabled: ON -> shows Client Corp XYZ
      const htmlOn = buildModernInvoiceEmailHtml({
        invoice: {
          id: "inv-2",
          invoiceNumber: "INV-002",
          date: new Date(),
          dueDate: new Date(),
          finalAmount: 2000,
        },
        company: { name: "Client Corp XYZ", showCompanyInEmailFooter: true },
        customer: { name: "Customer 2" },
      })
      expect(htmlOn).toContain(`&copy; ${currentYear} Client Corp XYZ. All rights reserved.`)
    })
  })

  describe("buildModernQuotationEmailHtml", () => {
    it("renders attractive quotation layout with proposal estimate and valid until date", () => {
      const html = buildModernQuotationEmailHtml({
        quotation: {
          id: "qt-100",
          quotationNumber: "QT-2026-099",
          date: new Date("2026-10-26"),
          expiryDate: new Date("2026-11-26"),
          currency: "INR",
          subTotal: 30000,
          totalTax: 5400,
          finalAmount: 35400,
        },
        company: { name: "Alpha Design Studio", email: "info@alpha.com" },
        customer: { name: "Sunil Patel", companyName: "Patel Group" },
        appUrl: "https://open-invoice.example.com",
      })

      expect(html).toContain("Quotation Proposal QT-2026-099")
      expect(html).toContain("QUOTATION ESTIMATE")
      expect(html).toContain("Alpha Design Studio")
      expect(html).toContain("Patel Group")
      expect(html).toContain("Valid Until")
      expect(html).toContain("QT-2026-099.pdf")
    })
  })

  describe("buildModernPaymentReceiptEmailHtml", () => {
    it("renders payment confirmation email with emerald green highlights and PDF note", () => {
      const html = buildModernPaymentReceiptEmailHtml({
        invoice: {
          id: "inv-500",
          invoiceNumber: "INV-500",
          currency: "INR",
          finalAmount: 15000,
          balanceDue: 0,
        },
        payment: {
          amount: 15000,
          paymentDate: new Date("2026-10-26"),
          paymentMethod: "UPI",
          referenceNumber: "UPI-TXN-998811",
        },
        company: { name: "Cloud Services" },
        customer: { name: "Priya Sharma" },
        appUrl: "https://open-invoice.example.com",
      })

      expect(html).toContain("Payment Confirmed!")
      expect(html).toContain("AMOUNT PAID")
      expect(html).toContain("UPI-TXN-998811")
      expect(html).toContain("Receipt-INV-500.pdf")
      expect(html).toContain("Invoice Fully Settled")
    })
  })

  describe("buildModernCampaignEmailHtml", () => {
    it("renders clean CRM campaign template with dynamic CTA button and open tracking pixel", () => {
      const html = buildModernCampaignEmailHtml({
        companyName: "Growth Marketing Inc",
        subject: "Exclusive Q4 Business Opportunity",
        content: "Hello team,\n\nWe have launched a brand new suite of features designed to double your billing efficiency.\n\nCheck out the demo now.",
        recipientName: "Aarav Sharma",
        buttonText: "Claim Early Access",
        clickTrackingUrl: "https://open-invoice.example.com/api/crm/track/click?logId=log123",
        openTrackingUrl: "https://open-invoice.example.com/api/crm/track/open?logId=log123",
        appName: "Open Invoice",
      })

      expect(html).toContain("Exclusive Q4 Business Opportunity")
      expect(html).toContain("Growth Marketing Inc")
      expect(html).toContain("Dear Aarav Sharma,")
      expect(html).toContain("Claim Early Access")
      expect(html).toContain("https://open-invoice.example.com/api/crm/track/click?logId=log123")
      expect(html).toContain("https://open-invoice.example.com/api/crm/track/open?logId=log123")
      expect(html).toContain("display:none !important")
      expect(html).toContain("Sent via")
    })
  })
})
