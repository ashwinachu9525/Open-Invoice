"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { extendTrial } from "@/actions/trial"
import { toast } from "sonner"
import { RefreshCcw } from "lucide-react"

interface ExtendTrialButtonProps {
  companyId: string
  days?: number
}

export function ExtendTrialButton({ companyId, days = 7 }: ExtendTrialButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleExtend() {
    setLoading(true)
    try {
      const res = await extendTrial(companyId, days)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(res.message || `Trial extended by ${days} days`)
      }
    } catch {
      toast.error("Failed to extend trial")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExtend}
      disabled={loading}
      className="text-xs h-8 border-indigo-500/20 hover:border-indigo-500/50 hover:bg-indigo-500/5 text-slate-200"
    >
      {loading && <RefreshCcw className="w-3.5 h-3.5 animate-spin mr-1.5" />}
      Extend {days} Days
    </Button>
  )
}
