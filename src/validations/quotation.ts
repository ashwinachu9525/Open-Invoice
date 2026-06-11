import { z } from "zod"

export const quotationItemSchema = z.object({
  description: z.string().min(1, "Description required"),
  hsnSac: z.string().optional(),
  quantity: z.number().positive("Quantity must be positive"),
  unitPrice: z.number().min(0, "Price must be non-negative"),
  discount: z.number().min(0),
  taxPercentage: z.number().min(0).max(100),
})

export const quotationSchema = z.object({
  customerId: z.string().min(1, "Customer required"),
  quotationNumber: z.string().min(1, "Quotation number required"),
  date: z.date(),
  expiryDate: z.date().optional(),
  currency: z.string(),
  exchangeRate: z.number().min(0).default(1),
  notes: z.string().optional(),
  terms: z.string().optional(),
  themeColor: z.string().optional(),
  themeFont: z.string().optional(),
  tdsPercentage: z.number().min(0).max(100),
  items: z.array(quotationItemSchema).min(1, "At least one line item required"),
})

export type QuotationFormValues = z.infer<typeof quotationSchema>
export type QuotationItemFormValues = z.infer<typeof quotationItemSchema>
