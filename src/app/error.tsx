"use client"

import { useEffect } from "react"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AlertTriangle, Home, RefreshCcw } from "lucide-react"
import Link from "next/link"
import { logAppError } from "@/actions/error-tracking"
import { usePathname } from "next/navigation"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const pathname = usePathname()

  useEffect(() => {
    // Log the error to our database via server action
    logAppError({
      message: error.message,
      digest: error.digest,
      path: pathname,
    }).catch(console.error)

    // Also log to console for standard development debugging
    console.error("Global Error Caught:", error)
  }, [error, pathname])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      
      <h1 className="text-3xl font-bold tracking-tight mb-3">Something went wrong</h1>
      <p className="text-muted-foreground max-w-md mx-auto mb-8">
        We encountered an unexpected error while trying to process your request. Our engineering team has been automatically notified.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <Button onClick={() => reset()} size="lg" className="w-full sm:w-auto">
          <RefreshCcw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
        <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}>
          <Home className="w-4 h-4 mr-2" />
          Return to Dashboard
        </Link>
      </div>

      {process.env.NODE_ENV === "development" && (
        <div className="mt-12 p-4 bg-muted/50 rounded-xl text-left max-w-2xl w-full overflow-auto">
          <p className="text-xs font-mono text-red-500 font-bold mb-2">DEVELOPMENT ONLY:</p>
          <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">
            {error.message}
            {"\n\n"}
            {error.stack}
          </pre>
        </div>
      )}
    </div>
  )
}
