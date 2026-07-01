"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireCompany } from "@/lib/auth-helpers"
import { encrypt } from "@/lib/encryption"
import { createAuditLog } from "@/services/audit"
import { revalidatePath } from "next/cache"

const aiSettingsSchema = z.object({
  provider: z.enum(["gemini", "openai", "nvidia", "openrouter"]),
  geminiKey: z.string().optional(),
  openaiKey: z.string().optional(),
  nvidiaKey: z.string().optional(),
  openrouterKey: z.string().optional(),
  fallbackOrder: z.array(z.enum(["gemini", "openai", "nvidia", "openrouter"])).min(1),
})

export async function getAISettings() {
  try {
    const { company } = await requireCompany()
    
    const settings = await prisma.aISettings.findUnique({
      where: { companyId: company.id },
    })

    if (!settings) {
      return {
        provider: "gemini",
        fallbackOrder: ["gemini", "openai", "nvidia", "openrouter"],
        hasGeminiKey: false,
        hasOpenAIKey: false,
        hasNvidiaKey: false,
        hasOpenrouterKey: false,
      }
    }

    return {
      provider: settings.provider,
      fallbackOrder: settings.fallbackOrder.split(",").map(s => s.trim()),
      hasGeminiKey: !!settings.geminiKey,
      hasOpenAIKey: !!settings.openaiKey,
      hasNvidiaKey: !!settings.nvidiaKey,
      hasOpenrouterKey: !!settings.openrouterKey,
    }
  } catch (error) {
    console.error("Failed to fetch AI settings:", error)
    return null
  }
}

export async function saveAISettings(data: unknown) {
  try {
    const { session, company } = await requireCompany()

    const parsed = aiSettingsSchema.safeParse(data)
    if (!parsed.success) {
      return { error: "Invalid AI settings data" }
    }

    const currentSettings = await prisma.aISettings.findUnique({
      where: { companyId: company.id },
    })

    const updateData: any = {
      provider: parsed.data.provider,
      fallbackOrder: parsed.data.fallbackOrder.join(","),
    }

    // Only update keys if provided. Empty string removes it. undefined keeps existing.
    if (parsed.data.geminiKey !== undefined) {
      updateData.geminiKey = parsed.data.geminiKey ? encrypt(parsed.data.geminiKey, company.id) : null
    }
    if (parsed.data.openaiKey !== undefined) {
      updateData.openaiKey = parsed.data.openaiKey ? encrypt(parsed.data.openaiKey, company.id) : null
    }
    if (parsed.data.nvidiaKey !== undefined) {
      updateData.nvidiaKey = parsed.data.nvidiaKey ? encrypt(parsed.data.nvidiaKey, company.id) : null
    }
    if (parsed.data.openrouterKey !== undefined) {
      updateData.openrouterKey = parsed.data.openrouterKey ? encrypt(parsed.data.openrouterKey, company.id) : null
    }

    if (currentSettings) {
      await prisma.aISettings.update({
        where: { id: currentSettings.id },
        data: updateData,
      })
    } else {
      await prisma.aISettings.create({
        data: {
          companyId: company.id,
          ...updateData,
        },
      })
    }

    await createAuditLog({
      companyId: company.id,
      userId: session.user.id,
      action: "UPDATE",
      entity: "AISettings",
      entityId: company.id,
      details: { 
        provider: parsed.data.provider,
        fallbackOrder: parsed.data.fallbackOrder 
      },
    })

    revalidatePath("/settings/ai")
    return { success: true }
  } catch (error) {
    console.error("Failed to save AI settings:", error)
    return { error: "Failed to save settings" }
  }
}
