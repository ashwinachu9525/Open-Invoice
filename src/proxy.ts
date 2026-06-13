import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"

const { auth } = NextAuth(authConfig)

// A very basic in-memory store for rate limiting at the Edge.
// Note: In a serverless environment (like Vercel), this Map is scoped to the specific isolate
// handling the request, meaning it's not a true global rate limit but still provides
// significant protection against individual bot spam targeting a specific edge node.
const edgeRateLimitStore = new Map<string, { count: number; resetAt: number }>()

function applyRateLimit(ip: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = edgeRateLimitStore.get(ip)

  if (!entry || now > entry.resetAt) {
    edgeRateLimitStore.set(ip, { count: 1, resetAt: now + windowMs })
    return true // Allowed
  }

  if (entry.count >= maxRequests) {
    return false // Blocked
  }

  entry.count++
  return true // Allowed
}

export default auth((request) => {
  // Only apply rate limiting to specific public API endpoints to prevent spam
  const path = request.nextUrl.pathname
  
  if (path.startsWith("/api/feedback") || path.startsWith("/api/public/")) {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown"
    
    // Allow 10 requests per minute per IP for public APIs
    const isAllowed = applyRateLimit(ip, 10, 60_000)
    
    if (!isAllowed) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { 
          status: 429, 
          headers: { "Content-Type": "application/json" } 
        }
      )
    }
  }

  // We intentionally do NOT modify headers here to ensure we don't accidentally
  // break the CSP headers defined in next.config.ts which allow the PDF blob previews.
  return NextResponse.next()
})

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/invoices/:path*",
    "/customers/:path*",
    "/settings/:path*",
    "/reports/:path*",
    "/ai/:path*",
    "/login",
    "/register",
    "/api/feedback/:path*",
    "/api/public/:path*",
  ],
}
