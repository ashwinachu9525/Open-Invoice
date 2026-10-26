/**
 * Utility functions for extracting client IP, detecting email clients/proxies,
 * and performing intelligent session-based deduplication for email tracking.
 */

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    const firstIp = forwarded.split(",")[0].trim()
    if (firstIp) return firstIp
  }

  const realIp = request.headers.get("x-real-ip")
  if (realIp && realIp.trim()) {
    return realIp.trim()
  }

  const cfIp = request.headers.get("cf-connecting-ip")
  if (cfIp && cfIp.trim()) {
    return cfIp.trim()
  }

  return "127.0.0.1"
}

export function parseClientDevice(userAgent: string): string {
  const ua = (userAgent || "").toLowerCase()

  if (ua.includes("googleimageproxy") || ua.includes("ggpht.com")) {
    return "Gmail (Google Image Proxy)"
  }
  if (ua.includes("yahoo") || ua.includes("yahooysmcm")) {
    return "Yahoo Mail Proxy"
  }
  if (ua.includes("thunderbird")) {
    return "Mozilla Thunderbird"
  }
  if (ua.includes("outlook") || ua.includes("office365") || ua.includes("microsoft")) {
    return "Microsoft Outlook"
  }
  if (ua.includes("iphone") || ua.includes("ipad")) {
    return "Apple Mail (iOS)"
  }
  if (ua.includes("macintosh") && ua.includes("safari") && !ua.includes("chrome")) {
    return "Apple Mail / Safari (macOS)"
  }
  if (ua.includes("android")) {
    return "Android Mail Client"
  }
  if (ua.includes("windows")) {
    return "Windows Email Client / Browser"
  }
  if (ua.includes("macintosh")) {
    return "macOS Email Client / Browser"
  }
  if (ua.includes("linux")) {
    return "Linux Client"
  }

  return "Standard Email Client"
}

/**
 * Checks if a request from this IP already occurred within the session window (default: 1 hour).
 * Prevents counting re-renders, proxy retries, user re-scrolling, or browser pre-fetches.
 */
export function isDuplicateSession(
  existingEvents: Array<{ ip: string; timestamp: string | Date }>,
  currentIp: string,
  windowMs = 3600_000 // 1 hour
): boolean {
  if (!existingEvents || existingEvents.length === 0) return false

  const nowMs = Date.now()

  // Check if this same IP opened within the window
  for (const event of existingEvents) {
    if (event.ip === currentIp) {
      const eventTime = new Date(event.timestamp).getTime()
      if (nowMs - eventTime < windowMs) {
        return true
      }
    }
  }

  return false
}
