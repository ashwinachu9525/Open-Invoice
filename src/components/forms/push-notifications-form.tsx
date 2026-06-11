"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Bell, BellOff, Loader2 } from "lucide-react"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/")

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function PushNotificationSettingsForm() {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true)
      checkSubscription()
    } else {
      setIsLoading(false)
    }
  }, [])

  async function checkSubscription() {
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (!registration) {
        setIsSupported(false)
        return
      }
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (error) {
      console.error("Error checking subscription:", error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSubscribe() {
    setIsLoading(true)
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (!registration) throw new Error("Service Worker is not registered (are you in dev mode?)")

      // Explicitly request notification permission from the browser
      const permission = await window.Notification.requestPermission()
      if (permission !== "granted") {
        throw new Error("Permission denied. Please enable notifications in your browser's address bar settings.")
      }

      // Get VAPID public key from backend
      const vapidRes = await fetch("/api/push/vapidPublic")
      if (!vapidRes.ok) throw new Error("Failed to fetch VAPID key")
      const { publicKey } = await vapidRes.json()

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      // Send subscription to backend
      const saveRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      })

      if (!saveRes.ok) throw new Error("Failed to save subscription")

      setIsSubscribed(true)
      toast.success("Push notifications enabled for this device.")
    } catch (error: any) {
      console.error("Subscription error:", error)
      toast.error(error.message || "Failed to enable notifications. Please check browser permissions.")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleUnsubscribe() {
    setIsLoading(true)
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (!registration) return
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
        // We could also call an API to delete it from the DB, but push.ts cleans up expired ones
        setIsSubscribed(false)
        toast.success("Push notifications disabled.")
      }
    } catch (error) {
      console.error("Unsubscribe error:", error)
      toast.error("Failed to disable notifications.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!isSupported) {
    return (
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <BellOff className="h-4 w-4" />
        Push notifications are not supported in this browser.
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Device Notifications</p>
          <p className="text-sm text-muted-foreground">
            Receive alerts when recurring invoices are generated or payments are made.
          </p>
        </div>
        <Button
          variant={isSubscribed ? "outline" : "default"}
          onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
          disabled={isLoading}
          className="min-w-[120px]"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isSubscribed ? (
            <>
              <BellOff className="h-4 w-4 mr-2" />
              Disable
            </>
          ) : (
            <>
              <Bell className="h-4 w-4 mr-2" />
              Enable
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
