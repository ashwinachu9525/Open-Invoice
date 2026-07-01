import { z } from "zod"

export const companySchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters"),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  cinNumber: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  address: z.string().optional(),
  state: z.string().optional(),
  baseCurrency: z.string().optional(),
  invoiceTemplate: z.string().optional(),
  whatsappProvider: z.enum(["official", "openwa"]).optional(),
  msmeNumber: z.string().optional(),
  msmeType: z.string().optional(),
  tcsRate: z.number().optional(),
  vpaAddress: z.string().optional().nullable(),
  razorpayKeyId: z.string().optional().nullable(),
  razorpayKeySecret: z.string().optional().nullable(),
  razorpayWebhookSecret: z.string().optional().nullable(),
  customDomain: z.string()
    .transform(val => val?.trim().toLowerCase())
    .refine(val => !val || /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?$/.test(val), {
      message: "Invalid domain format (e.g. billing.acme.com)"
    })
    .optional()
    .nullable(),
})

export type CompanyFormValues = z.infer<typeof companySchema>
