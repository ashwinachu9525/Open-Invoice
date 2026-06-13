import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Soft delete the user
    await prisma.user.update({
      where: { id: session.user.id },
      data: { deletedAt: new Date() },
    })

    // No need to physically delete the sessions here because NextAuth
    // will just sign them out client-side, but it's good practice.
    await prisma.session.deleteMany({
      where: { userId: session.user.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete account error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
