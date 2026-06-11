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

    // Construct Tally XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${company.name}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
`

    for (const inv of invoices) {
      const dateStr = new Date(inv.date).toISOString().split("T")[0].replace(/-/g, "") // YYYYMMDD
      
      xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Sales" ACTION="Create">
            <DATE>${dateStr}</DATE>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${inv.invoiceNumber}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${inv.customer.name}</PARTYLEDGERNAME>
            <NARRATION>${inv.notes || ""}</NARRATION>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${inv.customer.name}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${inv.finalAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
`

      for (const item of inv.items) {
        xml += `            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Sales Account</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${item.taxableAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
`
      }

      if (inv.cgstAmount > 0) {
        xml += `            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Output CGST</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${inv.cgstAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
`
      }
      if (inv.sgstAmount > 0) {
        xml += `            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Output SGST</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${inv.sgstAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
`
      }
      if (inv.igstAmount > 0) {
        xml += `            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Output IGST</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${inv.igstAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
`
      }

      xml += `          </VOUCHER>
        </TALLYMESSAGE>
`
    }

    xml += `      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>
`

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
        "Content-Disposition": `attachment; filename="Tally_Sales_${Date.now()}.xml"`,
      },
    })
  } catch (error) {
    console.error(error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
