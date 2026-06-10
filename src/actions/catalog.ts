"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export async function getCatalogItems() {
  const session = await auth()
  if (!session?.user?.companyId) {
    return { error: "Unauthorized", items: [] }
  }

  try {
    const items = await prisma.productCatalog.findMany({
      where: { 
        companyId: session.user.companyId,
        deletedAt: null
      },
      orderBy: { name: "asc" }
    })
    return { items }
  } catch (error) {
    console.error(error)
    return { error: "Failed to fetch catalog items", items: [] }
  }
}

export async function createCatalogItem(data: {
  name: string
  description?: string
  hsnSac?: string
  unitPrice: number
  taxPercentage: number
  unit?: string
}) {
  const session = await auth()
  if (!session?.user?.companyId) {
    return { error: "Unauthorized" }
  }

  try {
    const item = await prisma.productCatalog.create({
      data: {
        ...data,
        companyId: session.user.companyId,
      }
    })
    revalidatePath("/catalog")
    return { success: true, item }
  } catch (error) {
    console.error(error)
    return { error: "Failed to create catalog item" }
  }
}

export async function updateCatalogItem(id: string, data: {
  name?: string
  description?: string
  hsnSac?: string
  unitPrice?: number
  taxPercentage?: number
  unit?: string
  isActive?: boolean
}) {
  const session = await auth()
  if (!session?.user?.companyId) {
    return { error: "Unauthorized" }
  }

  try {
    const item = await prisma.productCatalog.update({
      where: { 
        id,
        companyId: session.user.companyId
      },
      data
    })
    revalidatePath("/catalog")
    return { success: true, item }
  } catch (error) {
    console.error(error)
    return { error: "Failed to update catalog item" }
  }
}

export async function deleteCatalogItem(id: string) {
  const session = await auth()
  if (!session?.user?.companyId) {
    return { error: "Unauthorized" }
  }

  try {
    await prisma.productCatalog.update({
      where: { 
        id,
        companyId: session.user.companyId
      },
      data: {
        deletedAt: new Date()
      }
    })
    revalidatePath("/catalog")
    return { success: true }
  } catch (error) {
    console.error(error)
    return { error: "Failed to delete catalog item" }
  }
}
