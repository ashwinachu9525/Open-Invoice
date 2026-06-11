"use client"

import { useState, useEffect } from "react"
import { WifiOff } from "lucide-react"

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    // Check initial state
    setIsOffline(!navigator.onLine)

    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium animate-in fade-in zoom-in duration-300">
      <WifiOff className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Offline</span>
    </div>
  )
}
