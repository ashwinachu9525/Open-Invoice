"use client"

import { useState } from "react"
import { Lock, Unlock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { toggleInvoiceFreeze } from "@/actions/invoice"

export function ToggleFreezeButton({ invoiceId, isFrozen }: { invoiceId: string, isFrozen: boolean }) {
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    setLoading(true)
    const res = await toggleInvoiceFreeze(invoiceId, !isFrozen)
    setLoading(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(isFrozen ? "Invoice un-frozen" : "Invoice frozen")
    }
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleToggle} 
      disabled={loading}
      className={`glass border-white/10 hover:bg-white/8 gap-1.5 ${isFrozen ? "text-amber-400 border-amber-500/30" : "text-blue-400 border-blue-500/30"}`}
    >
      {isFrozen ? (
        <>
          <Unlock className="h-4 w-4" />
          Unfreeze
        </>
      ) : (
        <>
          <Lock className="h-4 w-4" />
          Freeze
        </>
      )}
    </Button>
  )
}
