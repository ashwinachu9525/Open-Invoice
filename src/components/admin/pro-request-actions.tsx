"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { approveProRequest, rejectProRequest } from "@/actions/subscription"
import { toast } from "sonner"
import { Check, X, Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

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

      <AlertDialog>
        <AlertDialogTrigger render={
          <Button 
            size="sm" 
            variant="destructive"
            disabled={loading !== null}
            className="h-8"
          >
            {loading === "reject" ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 mr-1" />}
            Reject
          </Button>
        } />
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">Reject Upgrade Request?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to reject this company's request to upgrade to the Pro plan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2 justify-end">
            <AlertDialogCancel className="border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-rose-600 hover:bg-rose-700 text-slate-100"
            >
              Reject Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
