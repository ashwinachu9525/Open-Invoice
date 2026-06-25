"use server"

import * as argon2 from "argon2"
import { randomBytes } from "crypto"
import { prisma } from "@/lib/prisma"
import { registerSchema, forgotPasswordSchema, resetPasswordSchema } from "@/validations/auth"
import { rateLimit } from "@/lib/rate-limit"
import { hashToken } from "@/lib/crypto"
import { Role } from "@prisma/client"
import { signIn } from "@/auth"
import { sendVerificationEmail, sendPasswordResetEmail, sendPasswordResetSuccessEmail } from "@/services/smtp"
import { applyReferralReward, ensureReferralCode } from "@/actions/referral"
import fs from "fs"
import path from "path"

function getSystemConfigSync() {
  try {
    const configPath = path.join(process.cwd(), "src/config/system-settings.json")
    if (fs.existsSync(configPath)) {
      const fileContent = fs.readFileSync(configPath, "utf-8")
      return JSON.parse(fileContent)
    }
  } catch (err) {
    console.error("Failed to read system-settings.json:", err)
  }
  return {
    maintenanceMode: false,
    registrationOpen: true,
    systemLogLevel: "info",
    requireEmailVerification: false
  }
}


export async function registerUser(data: {
  name: string
  email: string
  password: string
  confirmPassword: string
  referralCode?: string
}) {
  try {
    const config = getSystemConfigSync()
    if (!config.registrationOpen) {
      return { error: "Registration is currently closed by the administrator." }
    }

    const parsed = registerSchema.safeParse(data)
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid data" }
    }

    const limit = rateLimit(`register:${parsed.data.email}`, {
      windowMs: 3600_000,
      maxRequests: 5,
    })
    if (!limit.success) return { error: "Too many attempts. Try again later." }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    })
    if (existing) return { error: "Email already registered" }

    const hashedPassword = await argon2.hash(parsed.data.password)
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // Validate the referral code if provided
    let validReferralCode: string | undefined = undefined
    if (parsed.data.referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: parsed.data.referralCode.toUpperCase().trim() },
        select: { id: true },
      })
      if (referrer) {
        validReferralCode = parsed.data.referralCode.toUpperCase().trim()
      }
    }

    const company = await prisma.company.create({
      data: { name: `${parsed.data.name}'s Business` },
    })

    const newUser = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: hashedPassword,
        role: Role.BUSINESS_OWNER,
        companyId: company.id,
        referredBy: validReferralCode,
      },
    })

    // Generate a unique referral code for the new user
    await ensureReferralCode(newUser.id)

    await prisma.verificationToken.deleteMany({
      where: { identifier: parsed.data.email }
    })

    await prisma.verificationToken.create({
      data: {
        identifier: parsed.data.email,
        token: hashToken(otp),
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })

    try {
      await sendVerificationEmail(parsed.data.email, otp)
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError)
      // Even if email fails, the user is created. We can still succeed, or we can fail.
      // If we fail here, the user is already created, so next time they'll get "Email already registered".
      // It's better to log the error and allow them to proceed to /verify-email where they can request a new OTP.
    }

    return { success: true }
  } catch (error) {
    console.error("Registration error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function verifyEmail(email: string, otp: string) {
  try {
    const limit = rateLimit(`verify:${email}`, { windowMs: 15 * 60 * 1000, maxRequests: 5 })
    if (!limit.success) return { error: "Too many attempts" }

    const tokenRecord = await prisma.verificationToken.findFirst({
      where: {
        identifier: email,
        token: hashToken(otp),
        expires: { gt: new Date() }
      }
    })

    if (!tokenRecord) {
      return { error: "Invalid or expired OTP" }
    }

    await prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() }
    })

    await prisma.verificationToken.delete({
      where: { identifier_token: { identifier: email, token: hashToken(otp) } }
    })

    return { success: true }
  } catch (error) {
    console.error("verifyEmail error:", error)
    return { error: "An unexpected error occurred while verifying the OTP." }
  }
}

export async function loginUser(email: string, password: string, totpToken?: string) {
  try {
    const user = await prisma.user.findUnique({ where: { email, deletedAt: null } })
    if (user && !user.emailVerified) {
      return { error: "Please verify your email address before logging in.", requiresVerification: true }
    }

    if (!user || !user.password) {
      return { error: "Invalid email or password" }
    }

    // Verify password
    const isPasswordValid = await argon2.verify(user.password, password)
    if (!isPasswordValid) {
      return { error: "Invalid email or password" }
    }

    const payload: any = { email, password, redirect: false }
    if (totpToken) {
      payload.totpToken = totpToken
    }
    await signIn("credentials", payload)

    // Trigger referral reward if the logging-in user was referred and hasn't been rewarded yet
    if (user.referredBy) {
      try {
        const redemption = await prisma.referralRedemption.findFirst({
          where: { referredUserId: user.id },
        })
        if (!redemption) {
          await applyReferralReward(user.referredBy, user.id)
        }
      } catch (err) {
        console.error("Failed to apply referral reward on login:", err)
      }
    }

    return { success: true, role: user?.role }
  } catch (error: any) {
    if (error?.message === "MFA_REQUIRED" || error?.cause?.err?.message === "MFA_REQUIRED") {
      return { error: "MFA_REQUIRED", requiresMfa: true }
    }
    if (error?.type === "CredentialsSignin") {
      return { error: "Invalid email or password" }
    }
    return { error: error?.message || "Invalid email or password" }
  }
}

export async function requestPasswordReset(email: string) {
  const parsed = forgotPasswordSchema.safeParse({ email })
  if (!parsed.success) return { error: "Invalid email" }

  const limit = rateLimit(`reset:${email}`, { windowMs: 3600_000, maxRequests: 3 })
  if (!limit.success) return { error: "Too many attempts" }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return { success: true }

  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  await prisma.passwordResetToken.deleteMany({ where: { email } })
  await prisma.passwordResetToken.create({
    data: {
      email,
      token: hashToken(otp),
      expires: new Date(Date.now() + 60 * 60 * 1000),
    },
  })

  await sendPasswordResetEmail(email, otp)

  return { success: true }
}

export async function resetPassword(email: string, otp: string, password: string, confirmPassword: string) {
  const parsed = resetPasswordSchema.safeParse({ email, otp, password, confirmPassword })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }

  const resetRecord = await prisma.passwordResetToken.findFirst({
    where: { email: email, token: hashToken(otp), expires: { gt: new Date() } },
  })
  if (!resetRecord) return { error: "Invalid or expired OTP" }

  const hashedPassword = await argon2.hash(password)
  await prisma.user.update({
    where: { email: resetRecord.email },
    data: { password: hashedPassword },
  })
  await prisma.passwordResetToken.delete({ where: { id: resetRecord.id } })

  await sendPasswordResetSuccessEmail(resetRecord.email)

  return { success: true }
}
