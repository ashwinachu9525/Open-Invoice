import { NextRequest, NextResponse } from "next/server"
import { calculatePdfHash } from "@/lib/invoice-verification"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const invoiceId = formData.get("invoiceId") as string | null

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const uploadedHash = calculatePdfHash(buffer)

    if (invoiceId) {
      const cleanId = invoiceId.trim()
      const invoice = await prisma.invoice.findFirst({
        where: {
          OR: [{ id: cleanId }, { verificationToken: cleanId }],
          deletedAt: null,
        },
        include: { company: true },
      })

      if (!invoice) {
        return NextResponse.json({
          match: false,
          error: "Invoice not found",
          uploadedFileHash: uploadedHash,
        })
      }

      const match = invoice.pdfHash ? invoice.pdfHash.toLowerCase() === uploadedHash.toLowerCase() : false

      return NextResponse.json({
        match,
        uploadedFileHash: uploadedHash,
        expectedHash: invoice.pdfHash,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        companyName: invoice.company.name,
      })
    }

    // Search by hash across registered invoices
    const matchingInvoice = await prisma.invoice.findFirst({
      where: {
        pdfHash: uploadedHash,
        deletedAt: null,
      },
      include: { company: true },
    })

    if (matchingInvoice) {
      return NextResponse.json({
        match: true,
        uploadedFileHash: uploadedHash,
        expectedHash: matchingInvoice.pdfHash,
        invoiceId: matchingInvoice.id,
        invoiceNumber: matchingInvoice.invoiceNumber,
        companyName: matchingInvoice.company.name,
      })
    }

    return NextResponse.json({
      match: false,
      uploadedFileHash: uploadedHash,
    })
  } catch (error) {
    console.error("PDF Verification API error:", error)
    return NextResponse.json(
      { error: "Internal error processing PDF verification" },
      { status: 500 }
    )
  }
}
