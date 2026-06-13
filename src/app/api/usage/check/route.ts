import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { checkUsage, UsageFeature } from "@/lib/usage"
import { getClientIp } from "@/lib/rate-limit"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const feature = searchParams.get("feature") as UsageFeature

    if (!feature) {
      return NextResponse.json({ error: "Feature parameter is required" }, { status: 400 })
    }

    const session = await auth()
    const isAnonymous = !session?.user
    
    // Use user ID if logged in, otherwise fall back to IP address
    const identifier = session?.user?.id || getClientIp(request.headers)
    
    if (isAnonymous && feature === "ai_chat") {
      return NextResponse.json({ allowed: false, reason: "Please log in to use AI Chat." })
    }

    const result = await checkUsage(identifier, isAnonymous, feature)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error("[Usage Check Error]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
