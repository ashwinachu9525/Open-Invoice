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
 * Called after a new user registers with a referral code.
 * Awards the referrer 1 month of Pro (immediately, no admin approval).
 */
export async function applyReferralReward(referralCode: string, newUserId: string): Promise<void> {
  try {
    // Find the referrer
    const referrer = await prisma.user.findUnique({
      where: { referralCode },
      include: { company: true },
    })

    if (!referrer || !referrer.companyId) return

    // Prevent self-referral
    if (referrer.id === newUserId) return

    // Only reward once per referrer (one-time referral reward)
    if (referrer.referralRewardClaimed) return

    // Grant 1 month of Pro to referrer
    const proExpiry = new Date()
    proExpiry.setMonth(proExpiry.getMonth() + 1)

    await prisma.$transaction([
      // Mark the referrer's reward as claimed and set Pro
      prisma.user.update({
        where: { id: referrer.id },
        data: {
          referralRewardClaimed: true,
          isPro: true,
          proExpiry,
        },
      }),
      // Also upgrade their company tier to PRO
      prisma.company.update({
        where: { id: referrer.companyId },
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
    ])
  } catch (error) {
    // Non-fatal — referral reward failure should not block registration
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
  if (!referrer) return null
  // Code is valid only if referrer hasn't already claimed their reward
  if (referrer.referralRewardClaimed) return null
  return referrer
}
