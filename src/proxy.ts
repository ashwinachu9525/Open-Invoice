import { NextResponse } from "next/server"
import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"

const { auth } = NextAuth(authConfig)

// A very basic in-memory store for rate limiting at the Edge.
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

export default auth(async (request) => {
  const path = request.nextUrl.pathname
  const hostname = request.headers.get("host") || ""

  // Resolve platform domain status
  const platformHostnames = ["open-invoice.com", "app.open-invoice.com"]
  const isPlatformDomain = platformHostnames.some(d => hostname.startsWith(d)) || hostname === "localhost:3000"

  // Only rewrite if it's not a platform domain and not a static resource / core api
  const isStaticFile = path.includes(".") || path.startsWith("/_next/") || path.startsWith("/api/")

  if (!isPlatformDomain && !isStaticFile) {
    try {
      const origin = request.nextUrl.origin
      const res = await fetch(`${origin}/api/public/verify-domain?domain=${hostname.toLowerCase()}`)
      if (res.ok) {
        const data = await res.json()
        if (data.allowed && data.companyId) {
          const url = request.nextUrl.clone()
          url.pathname = `/_custom/${data.companyId}${path}`
          return NextResponse.rewrite(url)
        }
      }
    } catch (err) {
      console.error("Middleware domain rewrite error:", err)
    }
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-pathname", path)
  
  if (path.startsWith("/api/feedback") || path.startsWith("/api/public/")) {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown"
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

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
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
    "/p/:path*", // Include public billing routes for matching
    "/api/feedback/:path*",
    "/api/public/:path*",
  ],
}
