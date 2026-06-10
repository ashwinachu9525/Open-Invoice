const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

export function rateLimit(
  key: string,
  config: RateLimitConfig = { windowMs: 60_000, maxRequests: 10 }
): { success: boolean; remaining: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + config.windowMs })
    return { success: true, remaining: config.maxRequests - 1 }
  }

  if (entry.count >= config.maxRequests) {
    return { success: false, remaining: 0 }
  }

  entry.count++
  return { success: true, remaining: config.maxRequests - entry.count }
}

export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  )
}
