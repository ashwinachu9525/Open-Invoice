import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { recordUsage, UsageFeature } from "@/lib/usage"
import { getClientIp } from "@/lib/rate-limit"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const feature = body.feature as UsageFeature

    if (!feature) {
      return NextResponse.json({ error: "Feature parameter is required" }, { status: 400 })
    }

    const session = await auth()
    const isAnonymous = !session?.user
    
    // Use user ID if logged in, otherwise fall back to IP address
    const identifier = session?.user?.id || getClientIp(request.headers)
    
    await recordUsage(identifier, isAnonymous, feature)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Usage Record Error]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
