"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Gift, CheckCircle2, Sparkles, ArrowRight, Loader2 } from "lucide-react"
import { submitGoogleReferralCode, skipGoogleReferralCode, validateReferralCode } from "@/actions/referral"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface GoogleReferralModalProps {
  open: boolean
  onClose: () => void
}

export function GoogleReferralModal({ open, onClose }: GoogleReferralModalProps) {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [isPending, setIsPending] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [referralValid, setReferralValid] = useState<boolean | null>(null)

  // Real-time validation helper
  async function handleCodeChange(val: string) {
    const uppercaseCode = val.trim().toUpperCase()
    setCode(uppercaseCode)
    setError("")

    if (uppercaseCode.length < 4) {
      setReferralValid(null)
      return
    }

    setIsValidating(true)
    try {
      const result = await validateReferralCode(uppercaseCode)
      setReferralValid(!!result)
    } catch {
      setReferralValid(null)
    } finally {
      setIsValidating(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code) {
      setError("Please enter a referral code or click skip.")
      return
    }

    setIsPending(true)
    setError("")

    try {
      const res = await submitGoogleReferralCode(code)
      if (res.error) {
        setError(res.error)
        setReferralValid(false)
      } else {
        toast.success("🎁 Referral applied! You and your friend both got 1 month of Pro free!")
        onClose()
        router.refresh()
      }
    } catch {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsPending(false)
    }
  }

  async function handleSkip() {
    setIsPending(true)
    try {
      const res = await skipGoogleReferralCode()
      if (res.success) {
        toast.info("You skipped the referral setup.")
        onClose()
        router.refresh()
      } else {
        toast.error("Failed to dismiss the referral prompt.")
      }
    } catch {
      toast.error("An error occurred. Please try again.")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[440px] bg-slate-950 border border-slate-900 text-slate-100 shadow-2xl"
      >
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-lg shadow-amber-500/5 animate-pulse">
              <Gift className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-100 flex items-center gap-1.5">
                Got a Referral Code? <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" />
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs mt-0.5">
                Claim your free month of Pro features.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-4">
          <div className="space-y-2">
            <p className="text-xs text-slate-300 leading-relaxed">
              If a friend invited you to Open-Invoice, enter their referral code below. 
              You will both instantly receive **1 month of Pro** (₹299 value) absolutely free!
            </p>

            <div className="relative pt-2">
              <Input
                placeholder="INV-XXXXXXXX"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                disabled={isPending}
                className="uppercase tracking-widest font-mono text-center text-md font-bold h-12 bg-slate-900/60 border-slate-800 focus:border-amber-500/50 focus:ring-amber-500/10 text-amber-100 pr-10 placeholder:text-slate-600"
              />
              <div className="absolute right-3 top-5 flex items-center">
                {isValidating ? (
                  <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
                ) : referralValid === true ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : referralValid === false ? (
                  <span className="text-rose-500 font-bold text-sm">✗</span>
                ) : null}
              </div>
            </div>

            {referralValid === true && (
              <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1 font-medium">
                ✨ Valid referral! Claim 1 month of free Pro.
              </p>
            )}
            {referralValid === false && !error && (
              <p className="text-[11px] text-rose-400 mt-1">
                Invalid or already used referral code.
              </p>
            )}
            {error && (
              <p className="text-[11px] text-rose-500 font-medium mt-1">
                ⚠️ {error}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <Button
              type="submit"
              disabled={isPending || referralValid !== true}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 h-11 text-xs font-bold shadow-lg shadow-amber-500/10 flex items-center justify-center gap-1.5 transition-all duration-300 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Applying code...
                </>
              ) : (
                <>
                  Claim Pro Reward <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={handleSkip}
              disabled={isPending}
              className="text-xs h-10 hover:bg-white/5 text-slate-400 hover:text-slate-200 font-medium"
            >
              I don&apos;t have a code / Skip
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
