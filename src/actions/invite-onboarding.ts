"use server"

import * as argon2 from "argon2"
import { prisma } from "@/lib/prisma"
import { hashToken } from "@/lib/crypto"
import { sendVerificationEmail } from "@/services/smtp"

export async function submitInviteOnboarding(params: {
  token: string
  name: string
  password: string
}) {
  try {
    const invitation = await prisma.teamInvitation.findUnique({
      where: { token: params.token },
      include: { company: true }
    })

    if (!invitation || invitation.expiresAt < new Date()) {
      return { error: "Invalid or expired invitation" }
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email }
    })

    if (existingUser) {
      return { error: "An account with this email already exists. Please log in to accept the invitation." }
    }

    // Hash password
    const hashedPassword = await argon2.hash(params.password)

    // Create user (unverified, linked to company and role)
    await prisma.user.create({
      data: {
        email: invitation.email,
        name: params.name,
        password: hashedPassword,
        role: invitation.role,
        companyId: invitation.companyId,
      }
    })

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    await prisma.verificationToken.deleteMany({
      where: { identifier: invitation.email }
    })

    await prisma.verificationToken.create({
      data: {
        identifier: invitation.email,
        token: hashToken(otp),
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      }
    })

    // Send verification email
    try {
      await sendVerificationEmail(invitation.email, otp)
    } catch (emailErr) {
      console.error("Failed to send verification email:", emailErr)
      // Do not block flow, they can request OTP again or we let them know
    }

    return { success: true, email: invitation.email }
  } catch (error: any) {
    console.error("submitInviteOnboarding error:", error)
    return { error: error.message || "An unexpected error occurred" }
  }
}

export async function verifyInviteOtp(params: {
  email: string
  otp: string
  token: string
}) {
  try {
    const invitation = await prisma.teamInvitation.findUnique({
      where: { token: params.token }
    })

    if (!invitation || invitation.expiresAt < new Date()) {
      return { error: "Invalid or expired invitation" }
    }

    if (invitation.email !== params.email) {
      return { error: "Email mismatch" }
    }

    const tokenRecord = await prisma.verificationToken.findFirst({
      where: {
        identifier: params.email,
        token: hashToken(params.otp),
        expires: { gt: new Date() }
      }
    })

    if (!tokenRecord) {
      return { error: "Invalid or expired OTP" }
    }

    // Verify user and complete onboarding
    await prisma.$transaction([
      // Set emailVerified
      prisma.user.update({
        where: { email: params.email },
        data: { emailVerified: new Date() }
      }),
      // Delete invitation
      prisma.teamInvitation.delete({
        where: { id: invitation.id }
      }),
      // Delete verification token
      prisma.verificationToken.delete({
        where: { identifier_token: { identifier: params.email, token: hashToken(params.otp) } }
      })
    ])

    return { success: true }
  } catch (error: any) {
    console.error("verifyInviteOtp error:", error)
    return { error: error.message || "An unexpected error occurred" }
  }
}
