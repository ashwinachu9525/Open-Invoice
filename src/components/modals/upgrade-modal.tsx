"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Sparkles } from "lucide-react"

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reason?: string
}

export function UpgradeModal({ open, onOpenChange, reason }: UpgradeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-blue-600" />
            </div>
            <DialogTitle className="text-2xl font-bold">Upgrade to Pro</DialogTitle>
          </div>
          {reason && (
            <DialogDescription className="text-rose-600 font-medium">
              {reason}
            </DialogDescription>
          )}
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm text-slate-600">
            Get unlimited access to all features and supercharge your business.
          </p>
          
          <ul className="space-y-3">
            {[
              "Unlimited invoice & quotation creation",
              "Unlimited AI chat sessions",
              "Custom domain mapping",
              "Advanced analytics & reporting",
              "Priority 24/7 support"
            ].map((benefit, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="flex flex-col gap-2 mt-4">
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700" 
            onClick={() => {
              // Mock upgrade flow for now
              alert("Pro Upgrade Flow Initiated! (Stripe checkout would open here)")
            }}
          >
            Upgrade to Pro
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
