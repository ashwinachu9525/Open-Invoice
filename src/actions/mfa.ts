"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { generateSecret as otplibGenerateSecret, generateURI, verifySync } from "otplib"
import * as QRCode from "qrcode"

async function requireUser() {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  return user
}

export async function generateMfaSecret() {
  const user = await requireUser()
  if (!user) return { error: "Unauthorized" }

  const secret = otplibGenerateSecret()
  const otpauth = generateURI({
    label: user.email ?? "user",
    issuer: "Open-Invoice",
    secret
  })
  const qrCodeDataUrl = await QRCode.toDataURL(otpauth)

  await prisma.user.update({
    where: { id: user.id },
    data: { mfaSecret: secret },
  })

  return { qrCodeDataUrl, secret }
}

export async function verifyAndEnableMfa(token: string) {
  const user = await requireUser()
  if (!user) return { error: "Unauthorized" }

  if (!user.mfaSecret) {
    return { error: "MFA secret not generated yet" }
  }

  const isValid = verifySync({ token, secret: user.mfaSecret })

  if (isValid) {
    await prisma.user.update({
      where: { id: user.id },
      data: { mfaEnabled: true },
    })
    return { success: true }
  } else {
    return { error: "Invalid TOTP code. Please try again." }
  }
}

export async function disableMfa() {
  const user = await requireUser()
  if (!user) return { error: "Unauthorized" }

  await prisma.user.update({
    where: { id: user.id },
    data: { mfaEnabled: false, mfaSecret: null },
  })

  return { success: true }
}
