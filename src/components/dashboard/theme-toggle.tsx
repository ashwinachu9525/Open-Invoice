"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const [dark, setDark] = useState(true)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem("theme")
    if (stored === "light") {
      document.documentElement.classList.remove("dark")
      setDark(false)
    } else {
      document.documentElement.classList.add("dark")
      setDark(true)
    }
  }, [])

  function toggle() {
    if (dark) {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
      setDark(false)
    } else {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
      setDark(true)
    }
  }

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full w-9 h-9 border border-slate-200 dark:border-white/10 opacity-70"
        aria-label="Toggle theme"
        disabled
      >
        <Sun className="h-4 w-4 text-slate-400" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className="rounded-full w-9 h-9 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 hover:scale-105 transition-all text-slate-700 dark:text-slate-200"
      aria-label="Toggle theme"
    >
      {dark ? (
        <Sun className="h-4 w-4 text-yellow-400" />
      ) : (
        <Moon className="h-4 w-4 text-indigo-500" />
      )}
    </Button>
  )
}
