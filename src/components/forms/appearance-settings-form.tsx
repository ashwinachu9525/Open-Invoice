"use client"

import { useEffect, useState } from "react"
import { Monitor, Moon, Sun } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

export function AppearanceSettingsForm() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system")

  useEffect(() => {
    const stored = localStorage.getItem("theme")
    if (stored === "light") {
      setTheme("light")
    } else if (stored === "dark") {
      setTheme("dark")
    } else {
      setTheme("dark") // Defaulting to dark as per the app's overall default
    }
  }, [])

  const handleThemeChange = (value: "light" | "dark" | "system") => {
    setTheme(value)
    
    if (value === "light") {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    } else if (value === "dark") {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      // System logic
      const isSystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      if (isSystemDark) {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
      localStorage.removeItem("theme")
    }
  }

  return (
    <div className="space-y-4">
      <RadioGroup
        value={theme}
        onValueChange={handleThemeChange}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div>
          <RadioGroupItem value="light" id="theme-light" className="peer sr-only" />
          <Label
            htmlFor="theme-light"
            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
          >
            <Sun className="mb-3 h-6 w-6 text-yellow-500" />
            Light
          </Label>
        </div>
        <div>
          <RadioGroupItem value="dark" id="theme-dark" className="peer sr-only" />
          <Label
            htmlFor="theme-dark"
            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
          >
            <Moon className="mb-3 h-6 w-6 text-indigo-500" />
            Dark
          </Label>
        </div>
        <div>
          <RadioGroupItem value="system" id="theme-system" className="peer sr-only" />
          <Label
            htmlFor="theme-system"
            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
          >
            <Monitor className="mb-3 h-6 w-6 text-slate-500" />
            System
          </Label>
        </div>
      </RadioGroup>
    </div>
  )
}
