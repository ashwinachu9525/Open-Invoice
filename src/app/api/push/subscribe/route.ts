import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { endpoint, keys } = await req.json()

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription payload" }, { status: 400 })
    }

    // Upsert or create subscription
    // Check if endpoint already exists
    const existing = await prisma.pushSubscription.findFirst({
      where: { endpoint }
    })

    if (existing) {
      if (existing.userId !== session.user.id) {
        await prisma.pushSubscription.update({
          where: { id: existing.id },
          data: { userId: session.user.id, p256dh: keys.p256dh, auth: keys.auth }
        })
      }
    } else {
      await prisma.pushSubscription.create({
        data: {
          userId: session.user.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Push subscription error:", error)
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 })
  }
}
