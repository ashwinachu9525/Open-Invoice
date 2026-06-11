import { describe, it, expect } from "vitest"
import { calculateLineItem, calculateInvoiceTax, isInterState, normalizeState } from "../tax-engine"

describe("Tax Engine", () => {
  describe("State Normalization & Interstate check", () => {
    it("should normalize states correctly", () => {
      expect(normalizeState(" tamil nadu ")).toBe("Tamil Nadu")
      expect(normalizeState("delhi")).toBe("Delhi")
      expect(normalizeState(null)).toBeNull()
    })

    it("should detect inter-state transactions correctly", () => {
      expect(isInterState("Tamil Nadu", "Delhi")).toBe(true)
      expect(isInterState("Delhi", "Delhi")).toBe(false)
      expect(isInterState("tamil nadu", "Tamil Nadu")).toBe(false)
    })
  })

  describe("calculateLineItem", () => {
    it("calculates basic line item totals", () => {
      const item = calculateLineItem({
        description: "Service A",
        quantity: 2,
        unitPrice: 100,
        discount: 20, // 200 - 20 = 180 taxable
        taxPercentage: 18, // 18% of 180 = 32.4
      })

      expect(item.taxableAmount).toBe(180)
      expect(item.taxAmount).toBe(32.4)
      expect(item.total).toBe(212.4)
    })
  })

  describe("calculateInvoiceTax", () => {
    it("calculates intra-state INDIA_GST correctly (CGST/SGST split)", () => {
      const result = calculateInvoiceTax({
        items: [
          { description: "Item 1", quantity: 1, unitPrice: 1000, discount: 0, taxPercentage: 18 }
        ],
        sellerState: "Tamil Nadu",
        buyerState: "Tamil Nadu",
        taxJurisdiction: "INDIA_GST"
      })

      expect(result.subTotal).toBe(1000)
      expect(result.totalTax).toBe(180)
      expect(result.cgstAmount).toBe(90)
      expect(result.sgstAmount).toBe(90)
      expect(result.igstAmount).toBe(0)
      expect(result.vatAmount).toBe(0)
      expect(result.finalAmount).toBe(1180)
    })

    it("calculates inter-state INDIA_GST correctly (IGST)", () => {
      const result = calculateInvoiceTax({
        items: [
          { description: "Item 1", quantity: 1, unitPrice: 1000, discount: 0, taxPercentage: 18 }
        ],
        sellerState: "Tamil Nadu",
        buyerState: "Delhi",
        taxJurisdiction: "INDIA_GST"
      })

      expect(result.totalTax).toBe(180)
      expect(result.cgstAmount).toBe(0)
      expect(result.sgstAmount).toBe(0)
      expect(result.igstAmount).toBe(180)
    })

    it("calculates EU_VAT correctly", () => {
      const result = calculateInvoiceTax({
        items: [
          { description: "Item 1", quantity: 1, unitPrice: 1000, discount: 0, taxPercentage: 20 }
        ],
        taxJurisdiction: "EU_VAT"
      })

      expect(result.totalTax).toBe(200)
      expect(result.vatAmount).toBe(200)
      expect(result.cgstAmount).toBe(0)
    })

    it("calculates TDS deductions correctly", () => {
      const result = calculateInvoiceTax({
        items: [
          { description: "Item 1", quantity: 1, unitPrice: 1000, discount: 0, taxPercentage: 18 }
        ],
        tdsPercentage: 10,
        taxJurisdiction: "INDIA_GST",
        sellerState: "Delhi",
        buyerState: "Delhi"
      })

      // Taxable: 1000
      // Tax: 180
      // TDS: 100 (10% of 1000)
      // Final: 1000 + 180 - 100 = 1080
      expect(result.tdsAmount).toBe(100)
      expect(result.finalAmount).toBe(1080)
    })
    
    it("handles no tax jurisdiction", () => {
      const result = calculateInvoiceTax({
        items: [
          { description: "Item 1", quantity: 1, unitPrice: 1000, discount: 0, taxPercentage: 18 }
        ],
        taxJurisdiction: "NONE"
      })

      expect(result.totalTax).toBe(0)
      expect(result.finalAmount).toBe(1000)
      expect(result.items[0].taxAmount).toBe(0)
    })
  })
})
