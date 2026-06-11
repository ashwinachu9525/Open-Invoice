import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { rating, comments } = await request.json()

  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Invalid rating" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { companyId: true }
  })

  await prisma.userFeedback.create({
    data: {
      userId: session.user.id,
      companyId: user?.companyId,
      rating,
      comments
    }
  })

  return NextResponse.json({ success: true })
}
