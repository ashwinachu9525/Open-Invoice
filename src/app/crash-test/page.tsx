"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function CrashTestPage() {
  const [shouldCrash, setShouldCrash] = useState(false)

  if (shouldCrash) {
    throw new Error("Simulated fatal application crash from /crash-test for Super Admin validation.")
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-background">
      <h1 className="text-2xl font-bold">Error Boundary Test Page</h1>
      <p className="text-muted-foreground text-center max-w-md">
        Clicking the button below will instantly throw an unhandled React error. 
        The global error boundary should catch it, render the fallback UI, and log the crash to the Super Admin dashboard.
      </p>
      
      <Button variant="destructive" size="lg" onClick={() => setShouldCrash(true)}>
        Trigger Fatal Crash
      </Button>
    </div>
  )
}
