import { renderToBuffer } from "@react-pdf/renderer"
import QRCode from "qrcode"
import { InvoiceDocument } from "@/pdf/invoice-document"
import { uploadFile } from "@/services/storage"
import { prisma } from "@/lib/prisma"

export async function generateInvoicePdf(invoiceId: string): Promise<Buffer> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true, customer: true, company: true },
  })

  if (!invoice) throw new Error("Invoice not found")

  const qrData = JSON.stringify({
    inv: invoice.invoiceNumber,
    amt: invoice.finalAmount,
    gst: invoice.company.gstNumber,
    date: invoice.date.toISOString().split("T")[0],
  })

  const qrCodeDataUrl = await QRCode.toDataURL(qrData, { width: 120, margin: 1 })

  const buffer = await renderToBuffer(
    InvoiceDocument({ invoice, qrCodeDataUrl })
  )

  if (process.env.S3_ACCESS_KEY_ID) {
    const key = `invoices/${invoice.companyId}/${invoice.invoiceNumber}.pdf`
    await uploadFile(key, buffer, "application/pdf")
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { pdfUrl: key },
    })
  }

  return buffer
}
