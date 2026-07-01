import { renderToBuffer } from "@react-pdf/renderer"
import QRCode from "qrcode"
import { InvoiceDocument } from "@/pdf/invoice-document"
import { StatementDocument } from "@/pdf/statement-document"
import { uploadFile } from "@/services/storage"
import { prisma } from "@/lib/prisma"
import { getTenantDb } from "@/lib/tenant-db"
import { redis } from "@/lib/redis"

export async function generateInvoicePdf(invoiceId: string, companyId?: string): Promise<Buffer> {
  const cacheKey = `invoice:pdf:${invoiceId}`
  if (redis) {
    try {
      const cachedBase64 = await redis.get(cacheKey)
      if (cachedBase64) {
        console.log(`⚡️ [PDF CACHE HIT] ${cacheKey}`)
        return Buffer.from(cachedBase64, "base64")
      }
    } catch (err) {
      console.warn("[Redis] Failed to load PDF from cache:", err)
    }
  }
  const db = companyId ? await getTenantDb(companyId) : prisma
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true, customer: true, company: true },
  })

  if (!invoice) throw new Error("Invoice not found")

  let qrCodeDataUrl = ""
  if (invoice.paymentCollectionMethod === "UPI_QR" && invoice.vpaAddress) {
    const payeeName = encodeURIComponent(invoice.company.name)
    const upiString = `upi://pay?pa=${invoice.vpaAddress}&pn=${payeeName}&am=${invoice.finalAmount.toFixed(2)}&cu=INR&tn=Invoice-${invoice.invoiceNumber}`
    qrCodeDataUrl = await QRCode.toDataURL(upiString, { width: 120, margin: 1 })
  } else {
    const qrData = JSON.stringify({
      inv: invoice.invoiceNumber,
      amt: invoice.finalAmount,
      gst: invoice.company.gstNumber,
      date: invoice.date.toISOString().split("T")[0],
    })
    qrCodeDataUrl = await QRCode.toDataURL(qrData, { width: 120, margin: 1 })
  }

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

  if (redis) {
    try {
      await redis.setex(cacheKey, 86400, buffer.toString("base64"))
      console.log(`💾 [PDF CACHE SET] ${cacheKey}`)
    } catch (err) {
      console.warn("[Redis] Failed to cache PDF:", err)
    }
  }

  return buffer
}

export async function invalidateInvoicePdfCache(invoiceId: string) {
  try {
    if (redis) {
      const cacheKey = `invoice:pdf:${invoiceId}`
      await redis.del(cacheKey)
      console.log(`🧹 [PDF CACHE INVALIDATED] ${cacheKey}`)
    }
  } catch (err) {
    console.warn("[Redis] Failed to invalidate PDF cache:", err)
  }
}

export async function generateStatementPdf(customerId: string, companyId?: string): Promise<Buffer> {
  const db = companyId ? await getTenantDb(companyId) : prisma

  const customer = await db.customer.findUnique({
    where: { id: customerId },
    include: { company: true },
  })

  if (!customer) throw new Error("Customer not found")

  const invoices = await db.invoice.findMany({
    where: { customerId, deletedAt: null, status: { notIn: ["DRAFT", "CANCELLED"] } },
    orderBy: { date: "asc" },
  })

  const totalBilled = invoices.reduce((s: number, i: any) => s + i.finalAmount, 0)
  const totalOutstanding = invoices.reduce((s: number, i: any) => s + i.balanceDue, 0)
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

export async function generateQuotationPdf(quotationId: string, companyId?: string): Promise<Buffer> {
  const db = companyId ? await getTenantDb(companyId) : prisma
  const quotation = await db.quotation.findUnique({
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

import { ReceiptPDFDocument } from "@/pdf/receipt-document"

export async function generateReceiptPdf(invoiceId: string, companyId?: string): Promise<Buffer> {
  const db = companyId ? await getTenantDb(companyId) : prisma
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      payments: {
        orderBy: { date: "desc" }
      },
      customer: true,
      company: true
    },
  })

  if (!invoice) throw new Error("Invoice not found")

  const buffer = await renderToBuffer(
    ReceiptPDFDocument({ invoice: invoice as any })
  )

  return buffer
}

