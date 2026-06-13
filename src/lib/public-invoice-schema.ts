import { z, ZodString } from "zod"
import { sanitizeInput } from "@/lib/sanitize"

const safeString = (schema: ZodString) => z.preprocess(
  (val) => (typeof val === "string" ? sanitizeInput(val) : val),
  schema
)

export const publicItemSchema = z.object({
  id: safeString(z.string()).optional(),
  description: safeString(z.string().min(1, "Description is required").max(500, "Description is too long")),
  quantity: z.number().min(0.01, "Quantity must be > 0").max(1000000, "Quantity too large"),
  unitPrice: z.number().min(0, "Price must be >= 0").max(1000000000, "Price too large"),
  discount: z.number().min(0, "Discount must be >= 0").max(100, "Discount cannot exceed 100%").optional().default(0),
  taxPercentage: z.number().min(0, "Tax must be >= 0").max(100, "Tax cannot exceed 100%").optional().default(0),
})

export const publicInvoiceSchema = z.object({
  // Type of document
  documentType: z.enum(["invoice", "quotation", "estimate"]),
  
  // Document details
  documentNumber: safeString(z.string().min(1, "Number is required").max(50, "Number too long")),
  date: z.date(),
  dueDate: z.date().optional(),
  currency: safeString(z.string().min(1).max(10)).default("USD"),
  
  // Company (From) details
  companyName: safeString(z.string().min(1, "Company name is required").max(200, "Company name too long")),
  companyAddress: safeString(z.string().max(500, "Address too long")).optional(),
  companyEmail: safeString(z.string().email("Invalid email").max(100)).optional().or(z.literal("")),
  companyPhone: safeString(z.string().max(50)).optional(),
  companyGst: safeString(z.string().max(50)).optional(),
  companyLogo: z.string().optional(), // Base64 data URL (don't sanitize base64 with DOMPurify)
  
  // Customer (To) details
  customerName: safeString(z.string().min(1, "Customer name is required").max(200, "Customer name too long")),
  customerAddress: safeString(z.string().max(500, "Address too long")).optional(),
  customerEmail: safeString(z.string().email("Invalid email").max(100)).optional().or(z.literal("")),
  customerPhone: safeString(z.string().max(50)).optional(),
  customerGst: safeString(z.string().max(50)).optional(),
  
  // Items
  items: z.array(publicItemSchema).min(1, "At least one item is required").max(100, "Maximum 100 items allowed"),
  
  // Additional info
  notes: safeString(z.string().max(2000, "Notes too long")).optional(),
  terms: safeString(z.string().max(2000, "Terms too long")).optional(),
  
  // Design configuration
  themeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#000000"), // color codes only
})

export type PublicItem = z.infer<typeof publicItemSchema>
export type PublicInvoiceData = z.infer<typeof publicInvoiceSchema>
