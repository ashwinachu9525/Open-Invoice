import Redis from "ioredis"

// Use Valkey/Redis URL from environment, or fallback to a dummy/memory instance if not present
// For local dev, you can spin up Valkey via docker or use Aiven URI
const redisUrl = process.env.VALKEY_URL || process.env.REDIS_URL || ""

const globalForRedis = globalThis as unknown as {
  redis: Redis | null | undefined
}

export const redis =
  globalForRedis.redis ??
  (redisUrl ? new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      // If we can't connect after 3 tries, stop trying so we don't crash the app
      // and we just fallback to DB (cache misses)
      if (times > 3) return null;
      return Math.min(times * 50, 2000);
    }
  }) : null)

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis

/**
 * Helper to get a cached value or fetch it and cache it.
 */
export async function getOrSetCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 3600 // default 1 hour
): Promise<T> {
  if (!redis) return fetcher() // If Redis is not configured, just bypass cache

  try {
    const cached = await redis.get(key)
    if (cached) {
      console.log(`⚡️ [CACHE HIT] ${key}`)
      return JSON.parse(cached) as T
    }
  } catch (error) {
    console.warn(`[Redis] Error getting cache for key ${key}:`, error)
  }

  // Cache miss
  console.log(`🐢 [CACHE MISS] ${key}`)
  const data = await fetcher()

  try {
    if (data !== null && data !== undefined) {
      await redis.setex(key, ttlSeconds, JSON.stringify(data))
    }
  } catch (error) {
    console.warn(`[Redis] Error setting cache for key ${key}:`, error)
  }

  return data
}

/**
 * Helper to delete keys matching a pattern (useful for invalidation)
 */
export async function invalidateCachePattern(pattern: string) {
  if (!redis) return
  try {
    let cursor = "0"
    do {
      const res = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100)
      cursor = res[0]
      const keys = res[1]
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } while (cursor !== "0")
  } catch (error) {
    console.warn(`[Redis] Error invalidating pattern ${pattern}:`, error)
  }
}
