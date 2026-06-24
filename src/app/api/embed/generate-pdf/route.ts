import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { PublicDocumentTemplate } from "@/pdf/public-document-template"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Basic validation
    if (!body.companyName || !body.customerName || !body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "Required fields: companyName, customerName, items (array)" }, { status: 400 })
    }

    // Adapt default fields if missing
    const data = {
      documentType: body.documentType || "invoice",
      companyName: body.companyName,
      companyAddress: body.companyAddress || "",
      companyEmail: body.companyEmail || "",
      companyPhone: body.companyPhone || "",
      companyGst: body.companyGst || "",
      documentNumber: body.documentNumber || "INV-001",
      date: body.date || new Date().toISOString(),
      dueDate: body.dueDate || new Date().toISOString(),
      customerName: body.customerName,
      customerAddress: body.customerAddress || "",
      customerEmail: body.customerEmail || "",
      customerPhone: body.customerPhone || "",
      customerGst: body.customerGst || "",
      currency: body.currency || "INR",
      themeColor: body.themeColor || "#4f46e5",
      notes: body.notes || "",
      terms: body.terms || "",
      items: body.items.map((item: any) => ({
        description: item.description || "Line Item",
        quantity: parseFloat(item.quantity) || 1,
        unitPrice: parseFloat(item.unitPrice) || 0,
        discount: parseFloat(item.discount) || 0,
        taxPercentage: parseFloat(item.taxPercentage) || 0,
      })),
    }

    const buffer = await renderToBuffer(
      PublicDocumentTemplate({ data })
    )

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${data.documentNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error("Failed to generate PDF in embed mode:", error)
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
  }
}
