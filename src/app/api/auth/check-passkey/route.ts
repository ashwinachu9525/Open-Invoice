import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get("email")

  if (!email) {
    return NextResponse.json({ enabled: false })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { passkeyEnabled: true },
    })

    return NextResponse.json({ enabled: user?.passkeyEnabled ?? false })
  } catch (e) {
    return NextResponse.json({ enabled: false })
  }
}
