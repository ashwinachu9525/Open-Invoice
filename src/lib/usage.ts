import { redis } from "./redis"
import { prisma } from "./prisma"

export const USAGE_LIMITS = {
  ANONYMOUS_DAILY: 3,
  FREE_USER_DAILY: 10,
  FREE_CHAT_SESSIONS: 4,
}

export type UsageFeature = "document_generation" | "ai_chat"

export interface UsageCheckResult {
  allowed: boolean
  remaining: number
  limit: number
  reason?: string
}

import { IS_FREE_MODE } from "./app-mode"

/**
 * Check if the user/IP is allowed to perform a certain action.
 */
export async function checkUsage(
  identifier: string, // IP address or User ID
  isAnonymous: boolean,
  featureType: UsageFeature
): Promise<UsageCheckResult> {
  // BYPASS for Self-Hosted/Free Mode
  if (IS_FREE_MODE) {
    return { allowed: true, remaining: 9999, limit: 9999 }
  }

  const isPro = await checkIsPro(identifier, isAnonymous)
  if (isPro) {
    return { allowed: true, remaining: 9999, limit: 9999 }
  }

  if (featureType === "document_generation") {
    return checkDocumentLimit(identifier, isAnonymous)
  }

  if (featureType === "ai_chat" && !isAnonymous) {
    return checkChatLimit(identifier)
  }

  return { allowed: false, remaining: 0, limit: 0, reason: "Feature unavailable." }
}

/**
 * Record that an action was successfully performed, incrementing the usage counter.
 */
export async function recordUsage(
  identifier: string,
  isAnonymous: boolean,
  featureType: UsageFeature
): Promise<void> {
  if (IS_FREE_MODE) return // BYPASS for Self-Hosted/Free Mode

  const isPro = await checkIsPro(identifier, isAnonymous)
  if (isPro) return // Don't track usage for Pro users to save Redis ops

  if (featureType === "document_generation" && redis) {
    const key = `usage:${featureType}:${identifier}`
    const current = await redis.get(key)
    if (!current) {
      // 86400 seconds = 24 hours
      await redis.setex(key, 86400, "1")
    } else {
      await redis.incr(key)
    }
  }
}

async function checkIsPro(identifier: string, isAnonymous: boolean): Promise<boolean> {
  if (isAnonymous) return false

  const user = await prisma.user.findUnique({
    where: { id: identifier },
    select: { isPro: true, proExpiry: true },
  })

  if (!user?.isPro) return false

  if (user.proExpiry && user.proExpiry < new Date()) {
    return false // Pro expired
  }

  return true
}

async function checkDocumentLimit(
  identifier: string,
  isAnonymous: boolean
): Promise<UsageCheckResult> {
  const limit = isAnonymous ? USAGE_LIMITS.ANONYMOUS_DAILY : USAGE_LIMITS.FREE_USER_DAILY
  
  if (!redis) {
    // If Redis is unavailable, degrade gracefully and allow
    return { allowed: true, remaining: limit, limit }
  }

  const key = `usage:document_generation:${identifier}`
  const currentStr = await redis.get(key)
  const current = currentStr ? parseInt(currentStr, 10) : 0

  if (current >= limit) {
    return {
      allowed: false,
      remaining: 0,
      limit,
      reason: isAnonymous 
        ? `You’ve reached your free limit (${limit}/day). Please login to continue.`
        : `You’ve reached your free limit (${limit}/day). Upgrade to Pro for unlimited access.`
    }
  }

  return {
    allowed: true,
    remaining: limit - current,
    limit
  }
}

async function checkChatLimit(userId: string): Promise<UsageCheckResult> {
  const limit = USAGE_LIMITS.FREE_CHAT_SESSIONS
  
  const activeChatsCount = await prisma.aIChatSession.count({
    where: { userId }
  })

  if (activeChatsCount >= limit) {
    return {
      allowed: false,
      remaining: 0,
      limit,
      reason: `You’ve reached your free AI chat limit (${limit} active chats). Upgrade to Pro for more access.`
    }
  }

  return {
    allowed: true,
    remaining: limit - activeChatsCount,
    limit
  }
}
