import { renderToBuffer } from "@react-pdf/renderer"
import QRCode from "qrcode"
import { InvoiceDocument } from "@/pdf/invoice-document"
import { StatementDocument } from "@/pdf/statement-document"
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

export async function generateStatementPdf(customerId: string): Promise<Buffer> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { company: true },
  })

  if (!customer) throw new Error("Customer not found")

  const invoices = await prisma.invoice.findMany({
    where: { customerId, deletedAt: null, status: { notIn: ["DRAFT", "CANCELLED"] } },
    orderBy: { date: "asc" },
  })

  const totalBilled = invoices.reduce((s, i) => s + i.finalAmount, 0)
  const totalOutstanding = invoices.reduce((s, i) => s + i.balanceDue, 0)
  const totalPaid = totalBilled - totalOutstanding

  const buffer = await renderToBuffer(
    StatementDocument({
      customer,
      company: customer.company,
      invoices,
      totalBilled,
      totalPaid,
      totalOutstanding,
    })
  )

  return buffer
}

import { QuotationDocument } from "@/pdf/quotation-document"

export async function generateQuotationPdf(quotationId: string): Promise<Buffer> {
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: { items: true, customer: true, company: true },
  })

  if (!quotation) throw new Error("Quotation not found")

  const qrData = JSON.stringify({
    qt: quotation.quotationNumber,
    amt: quotation.finalAmount,
    date: quotation.date.toISOString().split("T")[0],
  })

  const qrCodeDataUrl = await QRCode.toDataURL(qrData, { width: 120, margin: 1 })

  const buffer = await renderToBuffer(
    QuotationDocument({ quotation: quotation as any, qrCodeDataUrl })
  )

  if (process.env.S3_ACCESS_KEY_ID) {
    const key = `quotations/${quotation.companyId}/${quotation.quotationNumber}.pdf`
    await uploadFile(key, buffer, "application/pdf")
    await prisma.quotation.update({
      where: { id: quotationId },
      data: { pdfUrl: key },
    })
  }

  return buffer
}
