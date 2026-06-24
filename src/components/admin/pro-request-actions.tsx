"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { approveProRequest, rejectProRequest } from "@/actions/subscription"
import { toast } from "sonner"
import { Check, X, Loader2 } from "lucide-react"

export function ProRequestActions({ companyId }: { companyId: string }) {
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null)

  async function handleApprove() {
    setLoading("approve")
    const res = await approveProRequest(companyId)
    setLoading(null)
    if (res.success) {
      toast.success(res.message)
    } else {
      toast.error(res.error)
    }
  }

  async function handleReject() {
    if (!confirm("Are you sure you want to reject this upgrade request?")) return
    
    setLoading("reject")
    const res = await rejectProRequest(companyId)
    setLoading(null)
    if (res.success) {
      toast.success(res.message)
    } else {
      toast.error(res.error)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button 
        size="sm" 
        onClick={handleApprove} 
        disabled={loading !== null}
        className="bg-emerald-600 hover:bg-emerald-700 h-8"
      >
        {loading === "approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
        Approve
      </Button>
      <Button 
        size="sm" 
        variant="destructive"
        onClick={handleReject} 
        disabled={loading !== null}
        className="h-8"
      >
        {loading === "reject" ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 mr-1" />}
        Reject
      </Button>
    </div>
  )
}
