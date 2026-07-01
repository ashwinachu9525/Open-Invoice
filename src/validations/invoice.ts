import { z } from "zod"

export const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description required"),
  hsnSac: z.string().optional(),
  quantity: z.number().positive("Quantity must be positive"),
  unitPrice: z.number().min(0, "Price must be non-negative"),
  discount: z.number().min(0),
  taxPercentage: z.number().min(0).max(100),
})

export const invoiceSchema = z.object({
  customerId: z.string().min(1, "Customer required"),
  invoiceNumber: z.string().min(1, "Invoice number required"),
  date: z.date(),
  dueDate: z.date(),
  currency: z.string(),
  exchangeRate: z.number().min(0).default(1),
  taxJurisdiction: z.enum(["INDIA_GST", "EU_VAT", "US_SALES_TAX", "NONE"]).default("INDIA_GST"),
  notes: z.string().optional(),
  terms: z.string().optional(),
  internalNotes: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankIfscCode: z.string().optional(),
  bankAccountType: z.string().optional(),
  themeColor: z.string().optional(),
  themeFont: z.string().optional(),
  tdsPercentage: z.number().min(0).max(100),
  tcsRate: z.number().min(0).max(100).optional().default(0),
  items: z.array(invoiceItemSchema).min(1, "At least one line item required"),
  paymentCollectionMethod: z.string().optional().default("OFFLINE"),
  vpaAddress: z.string().optional().nullable(),
  razorpayOrderId: z.string().optional().nullable(),
  razorpayPaymentLinkId: z.string().optional().nullable(),
})

export type InvoiceFormValues = z.infer<typeof invoiceSchema>
export type InvoiceItemFormValues = z.infer<typeof invoiceItemSchema>
