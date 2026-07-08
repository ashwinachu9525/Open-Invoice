"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { defaultShortcuts, matchesBinding, UserShortcutConfig } from "@/lib/shortcuts"

interface GlobalShortcutListenerProps {
  customShortcuts?: UserShortcutConfig
}

export function GlobalShortcutListener({ customShortcuts = {} }: GlobalShortcutListenerProps) {
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement
      if (
        target.tagName === "INPUT" || 
        target.tagName === "TEXTAREA" || 
        target.isContentEditable
      ) {
        return
      }

      // Find matching shortcut
      for (const def of defaultShortcuts) {
        const binding = customShortcuts[def.id] || def.defaultBinding
        if (matchesBinding(e, binding)) {
          e.preventDefault()
          router.push(def.actionUrl)
          return
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [customShortcuts, router])

  return null
}
