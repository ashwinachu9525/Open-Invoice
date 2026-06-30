"use server"

import { prisma } from "@/lib/prisma"
import { requireCompany } from "@/lib/auth-helpers"
import { getTenantDb } from "@/lib/tenant-db"

export async function exportEInvoiceJSON(invoiceId: string) {
  try {
    const { company } = await requireCompany()
    const db = await getTenantDb(company.id)
    const invoice = await db.invoice.findFirst({
      where: { id: invoiceId, companyId: company.id },
      include: { items: true, customer: true, company: true }
    })

    if (!invoice) return { error: "Invoice not found" }

    // Map buyer details
    const buyerGstin = invoice.customer.gstin || "URP" // Unregistered Person

    // E-Invoice JSON Schema (v1.03) compliant formatting
    const schema = {
      Version: "1.03",
      TranDtls: {
        TaxSch: "GST",
        RegRev: "N",
        Typ: buyerGstin !== "URP" ? "B2B" : "B2C"
      },
      DocDtls: {
        Typ: "INV",
        No: invoice.invoiceNumber,
        Dt: invoice.date.toISOString().split("T")[0]
      },
      SellerDtls: {
        Gstin: invoice.company.gstNumber || "27AAAAA0000A1Z5",
        LglNm: invoice.company.name,
        Adr1: invoice.company.address || "Main Street",
        Loc: invoice.company.state || "Maharashtra",
        Pin: 400001,
        Stcd: "27"
      },
      BuyerDtls: {
        Gstin: buyerGstin,
        LglNm: invoice.customer.name,
        Adr1: invoice.customer.address || "Buyer Location",
        Loc: invoice.customer.state || "Maharashtra",
        Pin: 400001,
        Stcd: "27"
      },
      ValDtls: {
        AssVal: invoice.subTotal,
        CgstVal: invoice.cgstAmount,
        SgstVal: invoice.sgstAmount,
        IgstVal: invoice.igstAmount,
        TotInvVal: invoice.finalAmount
      },
      ItemList: invoice.items.map((item: any, idx: number) => ({
        SlNo: String(idx + 1),
        PrdDesc: item.description,
        IsServc: "N",
        HsnCd: item.hsnSac || "998311",
        Qty: item.quantity,
        FreeQty: 0,
        Unit: "NOS",
        UnitPrice: item.unitPrice,
        TotAmt: item.quantity * item.unitPrice,
        Discount: item.discount,
        PreTaxVal: item.taxableAmount,
        AssVal: item.taxableAmount,
        GstRt: item.taxPercentage,
        CgstAmt: invoice.cgstAmount > 0 ? (item.taxableAmount * (item.taxPercentage / 2)) / 100 : 0,
        SgstAmt: invoice.sgstAmount > 0 ? (item.taxableAmount * (item.taxPercentage / 2)) / 100 : 0,
        IgstAmt: invoice.igstAmount > 0 ? (item.taxableAmount * item.taxPercentage) / 100 : 0,
        TotItemVal: item.total
      }))
    }

    return { success: true, json: JSON.stringify(schema, null, 2), filename: `EInvoice_${invoice.invoiceNumber}.json` }
  } catch (error: any) {
    console.error("E-Invoice export failed:", error)
    return { error: error.message || "Failed to generate E-Invoice JSON" }
  }
}

export async function exportEWayBillJSON(invoiceId: string) {
  try {
    const { company } = await requireCompany()
    const db = await getTenantDb(company.id)
    const invoice = await db.invoice.findFirst({
      where: { id: invoiceId, companyId: company.id },
      include: { items: true, customer: true, company: true }
    })

    if (!invoice) return { error: "Invoice not found" }

    // NIC E-Way Bill schema representation
    const schema = {
      supplyType: "Outward",
      subType: "Supply",
      docType: "Tax Invoice",
      docNo: invoice.invoiceNumber,
      docDate: invoice.date.toISOString().split("T")[0],
      fromGstin: invoice.company.gstNumber || "27AAAAA0000A1Z5",
      fromTrdName: invoice.company.name,
      fromStateCode: 27,
      toGstin: invoice.customer.gstin || "URP",
      toTrdName: invoice.customer.name,
      toStateCode: 27,
      transactionType: "Regular",
      dispatchFromGSTIN: invoice.company.gstNumber || "27AAAAA0000A1Z5",
      shipToGSTIN: invoice.customer.gstin || "URP",
      totalValue: invoice.finalAmount,
      cgstValue: invoice.cgstAmount,
      sgstValue: invoice.sgstAmount,
      igstValue: invoice.igstAmount,
      mainHsnCode: invoice.items[0]?.hsnSac || "998311",
      itemList: invoice.items.map((item: any) => ({
        productName: item.description,
        hsnCode: item.hsnSac || "998311",
        quantity: item.quantity,
        qtyUnit: "NOS",
        taxableAmount: item.taxableAmount,
        cgstRate: invoice.cgstAmount > 0 ? item.taxPercentage / 2 : 0,
        sgstRate: invoice.sgstAmount > 0 ? item.taxPercentage / 2 : 0,
        igstRate: invoice.igstAmount > 0 ? item.taxPercentage : 0
      }))
    }

    return { success: true, json: JSON.stringify(schema, null, 2), filename: `EWayBill_${invoice.invoiceNumber}.json` }
  } catch (error: any) {
    console.error("E-Way Bill export failed:", error)
    return { error: error.message || "Failed to generate E-Way Bill JSON" }
  }
}
