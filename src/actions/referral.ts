"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

/** Generate a unique referral code like INV-AB12CD34 */
export async function generateReferralCode(): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = "INV-"
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

/** Ensure user has a referral code (idempotent). Returns the code. */
export async function ensureReferralCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } })
  if (user?.referralCode) return user.referralCode

  // Generate a unique code (retry on collision)
  let code = ""
  for (let attempts = 0; attempts < 10; attempts++) {
    code = await generateReferralCode()
    const existing = await prisma.user.findUnique({ where: { referralCode: code } })
    if (!existing) break
  }

  await prisma.user.update({ where: { id: userId }, data: { referralCode: code } })
  return code
}

/**
 * Called after a new user registers or logs in with a referral code.
 * Awards both the referrer (one-time) and the referred user 1 month of Pro.
 */
export async function applyReferralReward(referralCode: string, newUserId: string): Promise<void> {
  try {
    // Find the referrer
    const referrer = await prisma.user.findUnique({
      where: { referralCode: referralCode.toUpperCase().trim() },
      include: { company: true },
    })

    if (!referrer || !referrer.companyId) return

    // Prevent self-referral
    if (referrer.id === newUserId) return

    // Find the referred user (new/logging-in user)
    const referredUser = await prisma.user.findUnique({
      where: { id: newUserId },
      include: { company: true },
    })
    if (!referredUser || !referredUser.companyId) return

    // Prevent duplicate referrals (only one referral allowed per user)
    const existingRedemption = await prisma.referralRedemption.findFirst({
      where: { referredUserId: newUserId },
    })
    if (existingRedemption) return

    const proExpiry = new Date()
    proExpiry.setMonth(proExpiry.getMonth() + 1)

    const updates: any[] = [
      // Grant 1 month of Pro to the referred user
      prisma.user.update({
        where: { id: referredUser.id },
        data: {
          isPro: true,
          proExpiry,
        },
      }),
      // Upgrade referred user's company tier to PRO
      prisma.company.update({
        where: { id: referredUser.companyId },
        data: {
          subscriptionTier: "PRO",
          trialStartsAt: new Date(),
          trialEndsAt: proExpiry,
        },
      }),
      // Record the redemption
      prisma.referralRedemption.create({
        data: {
          referrerId: referrer.id,
          referredUserId: newUserId,
          referralCode,
          rewardGranted: true,
          proGrantedAt: new Date(),
        },
      }),
      // Mark the new user as referred
      prisma.user.update({
        where: { id: newUserId },
        data: { referredBy: referralCode },
      }),
    ]

    // Only reward the referrer if they haven't claimed it yet (one-time reward)
    if (!referrer.referralRewardClaimed) {
      updates.push(
        prisma.user.update({
          where: { id: referrer.id },
          data: {
            referralRewardClaimed: true,
            isPro: true,
            proExpiry,
          },
        })
      )
      updates.push(
        prisma.company.update({
          where: { id: referrer.companyId },
          data: {
            subscriptionTier: "PRO",
            trialStartsAt: new Date(),
            trialEndsAt: proExpiry,
          },
        })
      )
    }

    await prisma.$transaction(updates)
  } catch (error) {
    // Non-fatal — referral reward failure should not block registration or login
    console.error("applyReferralReward error:", error)
  }
}

/** Get referral data for the current session user */
export async function getReferralData() {
  const session = await auth()
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      referralCode: true,
      referralRewardClaimed: true,
      referredBy: true,
      referralRedemptions: {
        select: { id: true, createdAt: true, rewardGranted: true },
      },
    },
  })

  if (!user) return null

  // Ensure the user always has a referral code
  let code = user.referralCode
  if (!code) {
    code = await ensureReferralCode(user.id)
  }

  return {
    referralCode: code,
    rewardClaimed: user.referralRewardClaimed,
    referredBy: user.referredBy,
    successfulReferrals: user.referralRedemptions.filter((r) => r.rewardGranted).length,
  }
}

/** Validate a referral code — returns the referrer user or null */
export async function validateReferralCode(code: string) {
  if (!code || code.length < 4) return null
  const referrer = await prisma.user.findUnique({
    where: { referralCode: code.toUpperCase().trim() },
    select: { id: true, name: true, referralRewardClaimed: true },
  })
  return referrer
}

/**
 * Submit a referral code for a Google SSO user.
 * Validates the code, sets referredBy, and applies rewards.
 */
export async function submitGoogleReferralCode(code: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { error: "Not authenticated" }
    }

    const userId = session.user.id
    const referralCode = code.toUpperCase().trim()

    // 1. Validate referral code
    const referrer = await prisma.user.findFirst({
      where: { referralCode },
    })

    if (!referrer) {
      return { error: "Invalid referral code" }
    }

    if (referrer.id === userId) {
      return { error: "You cannot refer yourself" }
    }

    // 2. Check if already has a referral redemption
    const existing = await prisma.referralRedemption.findFirst({
      where: { referredUserId: userId },
    })
    if (existing) {
      return { error: "You have already redeemed a referral" }
    }

    // 3. Apply the reward
    await applyReferralReward(referralCode, userId)

    return { success: true }
  } catch (error) {
    console.error("submitGoogleReferralCode error:", error)
    return { error: "An unexpected error occurred" }
  }
}

/**
 * Skip/dismiss the Google referral code prompt.
 * Sets referredBy to "SKIPPED" so they aren't prompted again.
 */
export async function skipGoogleReferralCode() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { error: "Not authenticated" }
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { referredBy: "SKIPPED" },
    })

    return { success: true }
  } catch (error) {
    console.error("skipGoogleReferralCode error:", error)
    return { error: "An unexpected error occurred" }
  }
}
