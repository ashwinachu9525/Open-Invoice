import { NextResponse } from "next/server"
import { rateLimit, getClientIp } from "@/lib/rate-limit"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req.headers)
    const limit = rateLimit(`feedback_${ip}`, { windowMs: 3600_000, maxRequests: 5 }) // 5 per hour
    
    if (!limit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const { rating, comments, source } = await req.json()

    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Invalid rating" }, { status: 400 })
    }

    await prisma.publicFeedback.create({
      data: {
        rating,
        comments: comments ? String(comments).slice(0, 1000) : null,
        source: String(source || "unknown").slice(0, 50),
        ipAddress: ip,
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Feedback error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
