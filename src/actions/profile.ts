"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { profileSchema, testimonialSchema, ProfileFormValues, TestimonialFormValues } from "@/validations/profile"

export type ActionResponse = { success: boolean; error?: string }

export async function getCompanyProfileSettings() {
  const session = await auth()
  if (!session?.user?.id) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      company: {
        include: {
          testimonials: true,
        },
      },
    },
  })

  return user?.company || null
}

export async function generateUniqueSlug(name: string, excludeCompanyId?: string): Promise<string> {
  let baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
  if (!baseSlug) baseSlug = 'company'
  
  let slug = baseSlug
  let counter = 1
  
  while (true) {
    const existing = await prisma.company.findFirst({
      where: {
        slug,
        ...(excludeCompanyId ? { id: { not: excludeCompanyId } } : {})
      }
    })
    if (!existing) return slug
    slug = `${baseSlug}-${counter}`
    counter++
  }
}

export async function checkSlugAvailability(slug: string): Promise<{ available: boolean, suggestions: string[] }> {
  const session = await auth()
  if (!session?.user?.id) return { available: false, suggestions: [] }
  
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user || !user.companyId) return { available: false, suggestions: [] }

  const formattedSlug = slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
  if (!formattedSlug) return { available: false, suggestions: [] }

  const existing = await prisma.company.findFirst({
    where: {
      slug: formattedSlug,
      id: { not: user.companyId }
    }
  })

  if (!existing) return { available: true, suggestions: [] }

  const suggestions: string[] = []
  let counter = 1
  while (suggestions.length < 3) {
    const testSlug = `${formattedSlug}-${counter}`
    const isTaken = await prisma.company.findFirst({
      where: {
        slug: testSlug,
        id: { not: user.companyId }
      }
    })
    if (!isTaken) suggestions.push(testSlug)
    counter++
  }
  return { available: false, suggestions }
}

export async function updateProfileSettings(data: ProfileFormValues): Promise<ActionResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const validation = profileSchema.safeParse(data)
  if (!validation.success) {
    return { success: false, error: "Invalid data" }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })

  if (!user || !user.companyId) {
    return { success: false, error: "Company not found" }
  }

  try {
    if (data.slug) {
      const existing = await prisma.company.findFirst({
        where: {
          slug: data.slug,
          id: { not: user.companyId },
        },
      })
      if (existing) {
        return { success: false, error: "This slug is already taken" }
      }
    }

    await prisma.company.update({
      where: { id: user.companyId },
      data: {
        slug: data.slug || null,
        tagline: data.tagline || null,
        description: data.description || null,
        twitterUrl: data.twitterUrl || null,
        linkedinUrl: data.linkedinUrl || null,
        instagramUrl: data.instagramUrl || null,
        githubUrl: data.githubUrl || null,
      },
    })

    revalidatePath("/settings/profile")
    if (data.slug) {
      revalidatePath(`/p/${data.slug}`)
    }

    return { success: true }
  } catch (error: any) {
    console.error("Failed to update profile settings:", error)
    return { success: false, error: "Failed to update profile settings" }
  }
}

export async function addTestimonial(data: TestimonialFormValues): Promise<ActionResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const validation = testimonialSchema.safeParse(data)
  if (!validation.success) {
    return { success: false, error: "Invalid data" }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })

  if (!user || !user.companyId) {
    return { success: false, error: "Company not found" }
  }

  try {
    await prisma.testimonial.create({
      data: {
        ...validation.data,
        companyId: user.companyId,
      },
    })

    revalidatePath("/settings/profile")
    return { success: true }
  } catch (error) {
    return { success: false, error: "Failed to add testimonial" }
  }
}

export async function deleteTestimonial(id: string): Promise<ActionResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })

  if (!user || !user.companyId) {
    return { success: false, error: "Company not found" }
  }

  try {
    await prisma.testimonial.deleteMany({
      where: {
        id,
        companyId: user.companyId,
      },
    })

    revalidatePath("/settings/profile")
    return { success: true }
  } catch (error) {
    return { success: false, error: "Failed to delete testimonial" }
  }
}

export async function getCompanyProfileBySlug(slug: string) {
  const company = await prisma.company.findUnique({
    where: { slug },
    include: {
      catalog: {
        where: { isActive: true },
      },
      testimonials: true,
    },
  })

  return company
}

export async function sendContactFormEmail(slug: string, data: { name: string, email: string, message: string }): Promise<ActionResponse> {
  const company = await prisma.company.findUnique({
    where: { slug },
    include: {
      users: true
    }
  })

  if (!company) {
    return { success: false, error: "Company not found" }
  }

  const owner = company.users.find((u: any) => u.role === "BUSINESS_OWNER" || u.role === "OWNER") || company.users[0]
  if (!owner || !owner.email) {
    return { success: false, error: "Cannot send email at this time" }
  }

  try {
    console.log(`Sending contact email to ${owner.email} from ${data.email}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: "Failed to send message" }
  }
}
