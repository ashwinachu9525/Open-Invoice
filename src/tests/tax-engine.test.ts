import { describe, it, expect } from "vitest"
import { calculateInvoiceTax, isInterState, calculateLineItem } from "@/services/tax-engine"

describe("tax-engine", () => {
  it("calculates intra-state CGST/SGST", () => {
    const result = calculateInvoiceTax({
      items: [{ description: "Service", quantity: 1, unitPrice: 100000, discount: 0, taxPercentage: 18 }],
      sellerState: "Maharashtra",
      buyerState: "Maharashtra",
      tdsPercentage: 10,
    })

    expect(result.isInterState).toBe(false)
    expect(result.totalTax).toBe(18000)
    expect(result.cgstAmount).toBe(9000)
    expect(result.sgstAmount).toBe(9000)
    expect(result.igstAmount).toBe(0)
    expect(result.tdsAmount).toBe(10000)
    expect(result.finalAmount).toBe(108000)
  })

  it("calculates inter-state IGST", () => {
    const result = calculateInvoiceTax({
      items: [{ description: "Service", quantity: 1, unitPrice: 75000, discount: 0, taxPercentage: 18 }],
      sellerState: "Karnataka",
      buyerState: "Maharashtra",
      tdsPercentage: 0,
    })

    expect(result.isInterState).toBe(true)
    expect(result.igstAmount).toBe(13500)
    expect(result.cgstAmount).toBe(0)
    expect(result.finalAmount).toBe(88500)
  })

  it("detects inter-state correctly", () => {
    expect(isInterState("Maharashtra", "Gujarat")).toBe(true)
    expect(isInterState("Maharashtra", "Maharashtra")).toBe(false)
  })

  it("calculates line item with discount", () => {
    const item = calculateLineItem({
      description: "Dev",
      quantity: 1,
      unitPrice: 100000,
      discount: 10000,
      taxPercentage: 18,
    })
    expect(item.taxableAmount).toBe(90000)
    expect(item.taxAmount).toBe(16200)
    expect(item.total).toBe(106200)
  })
})
