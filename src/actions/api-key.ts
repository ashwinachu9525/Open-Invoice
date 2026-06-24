"use server"

import { prisma } from "@/lib/prisma"
import { requireCompany } from "@/lib/auth-helpers"
import { hashToken } from "@/lib/crypto"
import { randomBytes } from "crypto"
import { revalidatePath } from "next/cache"

export async function getApiKeys() {
  try {
    const { company } = await requireCompany()
    const keys = await prisma.apiKey.findMany({
      where: { companyId: company.id, isActive: true },
      orderBy: { createdAt: "desc" },
    })
    return { keys }
  } catch (error) {
    console.error("Failed to fetch API keys:", error)
    return { error: "Unauthorized or failed to load API keys" }
  }
}

export async function generateApiKey(name: string) {
  try {
    const { company } = await requireCompany()

    if (!name || name.trim().length === 0) {
      return { error: "API Key name is required" }
    }

    // Limit active API keys per company to 5 for resource management
    const existingCount = await prisma.apiKey.count({
      where: { companyId: company.id, isActive: true },
    })

    if (existingCount >= 5) {
      return { error: "You have reached the limit of 5 active API keys. Please revoke an existing key first." }
    }

    const token = randomBytes(24).toString("hex")
    const plainKey = `op_inv_live_${token}`
    const keyHash = hashToken(plainKey)
    const keyHint = `op_inv_live_...${plainKey.slice(-4)}`

    const apiKey = await prisma.apiKey.create({
      data: {
        name: name.trim(),
        keyHash,
        keyHint,
        companyId: company.id,
      },
    })

    revalidatePath("/settings/developer")
    return { success: true, plainKey, apiKey }
  } catch (error) {
    console.error("Failed to generate API key:", error)
    return { error: "Failed to generate API key" }
  }
}

export async function revokeApiKey(id: string) {
  try {
    const { company } = await requireCompany()

    const key = await prisma.apiKey.findFirst({
      where: { id, companyId: company.id },
    })

    if (!key) {
      return { error: "API Key not found or unauthorized" }
    }

    await prisma.apiKey.delete({
      where: { id },
    })

    revalidatePath("/settings/developer")
    return { success: true }
  } catch (error) {
    console.error("Failed to revoke API key:", error)
    return { error: "Failed to revoke API key" }
  }
}
