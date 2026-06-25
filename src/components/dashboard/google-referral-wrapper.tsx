"use client"

import { useState } from "react"
import { GoogleReferralModal } from "@/components/modals/google-referral-modal"

export function GoogleReferralWrapper({ showPrompt }: { showPrompt: boolean }) {
  const [open, setOpen] = useState(showPrompt)

  if (!open) return null

  return (
    <GoogleReferralModal 
      open={open} 
      onClose={() => setOpen(false)} 
    />
  )
}
