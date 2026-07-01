"use server"

import { prisma } from "@/lib/prisma"
import { requireCompany } from "@/lib/auth-helpers"
import { saveEmailSettings, testSmtpConnection, sendSmtpTestEmail } from "@/services/smtp"
import { z } from "zod"

const emailSettingsSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().min(1).max(65535),
  username: z.string().min(1),
  password: z.string().optional().or(z.literal("")),
  secure: z.boolean().default(true),
  fromEmail: z.string().email().optional().or(z.literal("")),
  fromName: z.string().optional(),
})

export async function updateEmailSettings(data: unknown) {
  try {
    const { company } = await requireCompany()
    const parsed = emailSettingsSchema.safeParse(data)
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid settings" }

    // If password is blank, keep the existing encrypted password
    let passwordEncrypted: string | undefined
    if (parsed.data.password) {
      const { encrypt } = await import("@/lib/crypto")
      passwordEncrypted = encrypt(parsed.data.password, company.id)
    } else {
      const existing = await prisma.emailSetting.findUnique({
        where: { companyId: company.id },
        select: { passwordEncrypted: true },
      })
      if (!existing) return { error: "Please enter a password for initial setup" }
      passwordEncrypted = existing.passwordEncrypted
    }

    await saveEmailSettings(company.id, {
      host: parsed.data.host,
      port: parsed.data.port,
      username: parsed.data.username,
      passwordEncrypted,
      secure: parsed.data.secure,
      fromEmail: parsed.data.fromEmail || undefined,
      fromName: parsed.data.fromName,
    })
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save settings" }
  }
}

export async function testEmailConnection() {
  try {
    const { company } = await requireCompany()
    const result = await testSmtpConnection(company.id)
    if (result.success) return { success: true }
    return { error: result.error ?? "Connection failed — check host, port and credentials" }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "SMTP not configured" }
  }
}

export async function sendTestEmail(toEmail: string) {
  try {
    const { company } = await requireCompany()
    await sendSmtpTestEmail(company.id, toEmail)
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to send test email" }
  }
}


export async function getEmailSettings() {
  try {
    const { company } = await requireCompany()
    const settings = await prisma.emailSetting.findUnique({
      where: { companyId: company.id },
      select: { host: true, port: true, username: true, secure: true, fromEmail: true, fromName: true },
    })
    return settings
  } catch {
    return null
  }
}
