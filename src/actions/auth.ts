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

export async function registerUser(data: {
  name: string
  email: string
  password: string
  confirmPassword: string
  referralCode?: string
}) {
  try {
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
      },
    })

    // Generate a unique referral code for the new user
    await ensureReferralCode(newUser.id)

    // Apply referral reward if a valid referral code was provided
    if (parsed.data.referralCode) {
      await applyReferralReward(parsed.data.referralCode, newUser.id)
    }

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

    const payload: any = { email, password, redirect: false }
    if (totpToken) {
      payload.totpToken = totpToken
    }
    await signIn("credentials", payload)
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
