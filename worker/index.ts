/// <reference lib="webworker" />

// @ts-expect-error
declare const self: ServiceWorkerGlobalScope
const swSelf = self as any

self.addEventListener("push", (event: any) => {
  if (event.data) {
    try {
      const data = event.data.json()
      
      const options = {
        body: data.body,
        icon: "/icon512_maskable.png", // Assuming icon exists
        badge: "/icon512_rounded.png",
        vibrate: [100, 50, 100],
        data: {
          url: data.url || "/",
        },
      }

      event.waitUntil(swSelf.registration.showNotification(data.title, options))
    } catch (e) {
      // If it's not JSON, fallback to text
      event.waitUntil(swSelf.registration.showNotification(event.data.text()))
    }
  }
})

self.addEventListener("notificationclick", (event: any) => {
  event.notification.close()

  if (event.notification.data?.url) {
    event.waitUntil(
      swSelf.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clientList: any) => {
          for (const client of clientList) {
            if (client.url === event.notification.data.url && "focus" in client) {
              return client.focus()
            }
          }
          if (swSelf.clients.openWindow) {
            return swSelf.clients.openWindow(event.notification.data.url)
          }
        })
    )
  }
})

