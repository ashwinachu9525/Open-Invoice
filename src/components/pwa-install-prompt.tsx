"use client"

import { useState, useEffect } from "react"
import { X, Share, PlusSquare, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PwaInstallPrompt() {
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [isStandalone, setIsStandalone] = useState(true) // assume true initially to prevent hydration mismatch/flash
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    // Check if running as standalone PWA
    const isRunningStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsStandalone(isRunningStandalone)

    if (isRunningStandalone) return

    // Check if dismissed previously
    const dismissed = localStorage.getItem("pwa-prompt-dismissed")
    if (dismissed) return

    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    const isAndroidDevice = /android/.test(userAgent)

    setIsIOS(isIosDevice)
    setIsAndroid(isAndroidDevice)

    if (isIosDevice) {
      setShowPrompt(true)
    }

    // Android specific: listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
  }, [])

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem("pwa-prompt-dismissed", "true")
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShowPrompt(false)
      }
      setDeferredPrompt(null)
    }
  }

  if (isStandalone || !showPrompt) return null

  if (isIOS) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background border-t shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.3)] pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex flex-col gap-2 relative max-w-md mx-auto">
          <button onClick={handleDismiss} className="absolute -right-2 -top-2 p-2 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Download className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 pr-6">
              <h3 className="font-semibold text-sm">Install Invoice AI</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Install this app on your device for a better experience. Tap <Share className="inline h-4 w-4 mx-1 align-sub" /> and then <PlusSquare className="inline h-4 w-4 mx-1 align-sub" /> <strong>Add to Home Screen</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isAndroid && deferredPrompt) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background border-t shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.3)] pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex flex-col gap-3 relative max-w-md mx-auto">
          <button onClick={handleDismiss} className="absolute -right-2 -top-2 p-2 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Download className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 pr-6">
              <h3 className="font-semibold text-sm">Install Invoice AI</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Install this app on your home screen for quick and easy offline access.
              </p>
            </div>
          </div>
          <Button onClick={handleInstallClick} className="w-full">
            Add to Home Screen
          </Button>
        </div>
      </div>
    )
  }

  return null
}
