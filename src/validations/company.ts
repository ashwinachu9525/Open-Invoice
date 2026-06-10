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
})

export type CompanyFormValues = z.infer<typeof companySchema>
