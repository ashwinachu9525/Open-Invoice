import { z } from "zod"

export const profileSchema = z.object({
  slug: z.string()
    .min(3, "Slug must be at least 3 characters")
    .max(50, "Slug cannot exceed 50 characters")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens")
    .optional()
    .nullable(),
  tagline: z.string().max(100, "Tagline cannot exceed 100 characters").optional().nullable(),
  description: z.string().max(2000, "Description cannot exceed 2000 characters").optional().nullable(),
  twitterUrl: z.string().url("Invalid URL").optional().nullable().or(z.literal("")),
  linkedinUrl: z.string().url("Invalid URL").optional().nullable().or(z.literal("")),
  instagramUrl: z.string().url("Invalid URL").optional().nullable().or(z.literal("")),
  githubUrl: z.string().url("Invalid URL").optional().nullable().or(z.literal("")),
})

export type ProfileFormValues = z.infer<typeof profileSchema>

export const testimonialSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  clientRole: z.string().optional().nullable(),
  content: z.string().min(1, "Content is required"),
  rating: z.number().min(1).max(5).default(5),
  avatarUrl: z.string().url().optional().nullable().or(z.literal("")),
})

export type TestimonialFormValues = z.infer<typeof testimonialSchema>
