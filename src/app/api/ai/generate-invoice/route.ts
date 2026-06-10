import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { generateInvoiceFromPrompt } from "@/ai/invoice-generator"
import { rateLimit, getClientIp } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const ip = getClientIp(request.headers)
  const limit = rateLimit(`ai:${session.user.id}:${ip}`, { windowMs: 60_000, maxRequests: 5 })
  if (!limit.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
  }

  const { prompt } = await request.json()
  if (!prompt) {
    return NextResponse.json({ error: "Prompt required" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { company: true },
  })

  if (!user?.company?.id) {
    return NextResponse.json({ error: "Company not found" }, { status: 400 })
  }

  const result = await generateInvoiceFromPrompt(user.company.id, prompt, user.company.state ?? undefined)
  return NextResponse.json(result)
}
