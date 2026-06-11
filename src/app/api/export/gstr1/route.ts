import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireCompany } from "@/lib/auth-helpers"
import { InvoiceStatus } from "@prisma/client"

export async function GET(req: NextRequest) {
  try {
    const { company } = await requireCompany()
    
    const searchParams = req.nextUrl.searchParams
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    const customerId = searchParams.get("customerId")

    const where = {
      companyId: company.id,
      deletedAt: null,
      status: { not: InvoiceStatus.DRAFT },
      ...(customerId ? { customerId } : {}),
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to + "T23:59:59") } : {}),
            },
          }
        : {}),
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: { customer: true, items: true },
      orderBy: { date: "asc" },
    })

    // Construct GSTR-1 JSON structure
    const b2b = []
    const b2cs = []

    for (const inv of invoices) {
      const isB2B = !!inv.customer.gstin

      // Group items by tax percentage for GST returns
      const rateMap = new Map()
      for (const item of inv.items) {
        const rate = item.taxPercentage || 0
        if (!rateMap.has(rate)) {
          rateMap.set(rate, { txval: 0, igst: 0, cgst: 0, sgst: 0 })
        }
        const data = rateMap.get(rate)
        data.txval += item.taxableAmount
        data.igst += item.taxAmount // Simplified, in reality would split depending on inter-state
        
        // This is a naive split for demo purposes. 
        // Real implementation should check `sellerState !== buyerState`
        const isInterState = company.state !== inv.customer.state
        if (isInterState) {
          data.igst += item.taxAmount
        } else {
          data.cgst += item.taxAmount / 2
          data.sgst += item.taxAmount / 2
        }
      }

      if (isB2B) {
        b2b.push({
          ctin: inv.customer.gstin,
          inv: [{
            inum: inv.invoiceNumber,
            idt: new Date(inv.date).toLocaleDateString("en-IN").replace(/\//g, "-"),
            val: inv.finalAmount,
            pos: inv.customer.state || company.state || "",
            rchrg: "N",
            inv_typ: "R",
            itms: Array.from(rateMap.entries()).map(([rate, vals]) => ({
              num: 1,
              itm_det: {
                rt: rate,
                txval: vals.txval,
                iamt: vals.igst,
                camt: vals.cgst,
                samt: vals.sgst,
                csamt: 0
              }
            }))
          }]
        })
      } else {
        b2cs.push({
          sply_ty: "INTRA",
          rt: Array.from(rateMap.keys())[0] || 0,
          typ: "OE",
          pos: inv.customer.state || company.state || "",
          txval: inv.subTotal,
          iamt: inv.igstAmount,
          camt: inv.cgstAmount,
          samt: inv.sgstAmount,
          csamt: 0
        })
      }
    }

    const gstr1 = {
      gstin: company.gstNumber || "",
      fp: new Date().toLocaleDateString("en-IN", { month: "2-digit", year: "numeric" }).replace("/", ""),
      gt: 0,
      cur_gt: 0,
      version: "GST3.0.4",
      hash: "hash",
      b2b,
      b2cs
    }

    return new NextResponse(JSON.stringify(gstr1, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="GSTR1_${company.gstNumber}_${Date.now()}.json"`,
      },
    })
  } catch (error) {
    console.error(error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
