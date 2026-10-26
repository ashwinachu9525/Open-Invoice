"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCcw, Home, Target } from "lucide-react"
import Link from "next/link"
import { logAppError } from "@/actions/error-tracking"
import { usePathname } from "next/navigation"

export default function CrmError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const pathname = usePathname()

  useEffect(() => {
    logAppError({
      message: error.message,
      digest: error.digest,
      path: pathname,
    }).catch(console.error)

    console.error("CRM Error Caught:", error)
  }, [error, pathname])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7 text-red-400" />
      </div>

      <h2 className="text-xl font-bold tracking-tight text-foreground mb-1.5">
        CRM Error Encountered
      </h2>
      <p className="text-sm text-muted-foreground max-w-md mb-2">
        {error.message || "An unexpected error occurred while loading this CRM section."}
      </p>
      {error.digest && (
        <p className="text-[11px] font-mono text-muted-foreground/60 mb-6">
          Digest: {error.digest}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button
          onClick={() => reset()}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          Try Again
        </Button>
        <Link href="/crm/dashboard">
          <Button variant="outline" size="sm" className="glass border-white/10 gap-2">
            <Target className="w-3.5 h-3.5" />
            CRM Dashboard
          </Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="text-muted-foreground gap-2">
            <Home className="w-3.5 h-3.5" />
            Invoicing Suite
          </Button>
        </Link>
      </div>
    </div>
  )
}
