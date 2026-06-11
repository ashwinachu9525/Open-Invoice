import webpush from "web-push"
import { prisma } from "@/lib/prisma"

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:admin@openinvoice.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
  process.env.VAPID_PRIVATE_KEY as string
)

export async function sendPushNotification(userId: string, payload: { title: string; body: string; url?: string }) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId }
  })

  if (subscriptions.length === 0) return

  const notifications = subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        JSON.stringify(payload)
      )
    } catch (error: any) {
      // If subscription is invalid/expired, remove it
      if (error.statusCode === 410 || error.statusCode === 404) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } })
      } else {
        console.error("Error sending push notification:", error)
      }
    }
  })

  await Promise.all(notifications)
}
