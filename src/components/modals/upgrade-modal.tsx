"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Sparkles, Gift, Copy, CheckCheck, Share2 } from "lucide-react"
import { getReferralData } from "@/actions/referral"
import { getProRequestStatus, requestProUpgrade } from "@/actions/subscription"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reason?: string
}

export function UpgradeModal({ open, onOpenChange, reason }: UpgradeModalProps) {
  const router = useRouter()
  
  // Referral states
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [referralRewardClaimed, setReferralRewardClaimed] = useState(false)
  const [successfulReferrals, setSuccessfulReferrals] = useState(0)
  const [copied, setCopied] = useState(false)

  // Pro request states
  const [proRequestStatus, setProRequestStatus] = useState<string | null>(null)
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    if (open) {
      // Fetch request status
      getProRequestStatus().then((res) => {
        setProRequestStatus(res.proRequestStatus)
      })
      // Fetch referral data
      getReferralData().then((res: any) => {
        if (res) {
          setReferralCode(res.referralCode)
          setReferralRewardClaimed(res.rewardClaimed)
          setSuccessfulReferrals(res.successfulReferrals)
        }
      })
    }
  }, [open])

  async function handleRequestPro() {
    setRequesting(true)
    try {
      const res = await requestProUpgrade()
      if (res.success) {
        toast.success(res.message || "Upgrade request submitted successfully!")
        setProRequestStatus("PENDING")
        router.refresh()
      } else {
        toast.error(res.error || "Failed to submit request.")
      }
    } catch {
      toast.error("An error occurred. Please try again.")
    } finally {
      setRequesting(false)
    }
  }

  const referralLink = referralCode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/register?ref=${referralCode}`
    : ""

  const whatsappShareText = referralCode
    ? encodeURIComponent(
        `🚀 Join Open-Invoice using my referral code *${referralCode}* and we both get 1 month of Pro features free!\n\nSign up here: ${referralLink}`
      )
    : ""

  function handleCopyReferral() {
    if (!referralLink) return
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true)
      toast.success("Referral link copied!")
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const isChatLimit = reason?.toLowerCase().includes("chat")
  const modalTitle = isChatLimit ? "AI Chat Limit Reached" : "Upgrade to Pro"
  const modalDescription = isChatLimit 
    ? "You have reached the limit of 2 active chat sessions. Upgrade to Pro for unlimited AI chat sessions and advanced billing capabilities."
    : "You have reached your daily document generation limit. Upgrade to Pro to create unlimited invoices and quotations."

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-slate-950 border-slate-900 text-slate-100">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-100">{modalTitle}</DialogTitle>
          </div>
          {reason && (
            <DialogDescription className="text-rose-400 font-medium text-xs">
              {reason}
            </DialogDescription>
          )}
        </DialogHeader>
        
        <div className="space-y-4 py-3">
          <p className="text-xs text-slate-400 leading-relaxed">
            {modalDescription} Refer friends to earn free Pro access, or request admin setup directly.
          </p>

          {/* Referral Container */}
          <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent p-4 space-y-3 relative overflow-hidden">
            <h3 className="font-semibold text-amber-400 flex items-center gap-1.5 text-xs">
              <Gift className="w-4 h-4" /> Get 1 Month Pro Free (Refer a Friend)
            </h3>
            <p className="text-[11px] text-slate-300 leading-normal">
              Share your referral link. When they sign up, you instantly get <b>1 month of Pro features free</b>.
            </p>
            
            {referralCode && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-slate-950/80 px-3 py-1.5">
                  <code className="flex-1 text-[10px] font-mono font-bold tracking-wider text-amber-200 select-all truncate">
                    {referralLink}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 hover:bg-amber-500/10 text-amber-400"
                    onClick={handleCopyReferral}
                  >
                    {copied ? <CheckCheck className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                
                <Button
                  size="sm"
                  className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs h-9 font-semibold flex items-center justify-center gap-1.5 border-0 shadow-lg shadow-[#25D366]/10"
                  onClick={() => window.open(`https://wa.me/?text=${whatsappShareText}`, "_blank")}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share on WhatsApp
                </Button>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col gap-2 mt-2">
          {proRequestStatus === "PENDING" ? (
            <Button disabled className="w-full bg-indigo-600/50 text-indigo-200 h-10 text-xs font-semibold">
              Request Pending Review
            </Button>
          ) : (
            <Button
              onClick={handleRequestPro}
              disabled={requesting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 h-10 text-xs font-semibold shadow-lg shadow-indigo-600/20"
            >
              {requesting ? "Submitting Request..." : "Request Pro Upgrade"}
            </Button>
          )}
          <p className="text-[9px] text-center text-slate-500 leading-normal mb-1">
            Our admin team will reach out directly to set up billing for your company.
          </p>

          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="text-xs h-9 hover:bg-white/5 text-slate-400 hover:text-slate-200"
          >
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
