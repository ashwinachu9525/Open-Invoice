"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Sparkles, BadgeCheck, AlertTriangle, ShieldCheck,
  Gift, Copy, CheckCheck, Share2, Users, Lock
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { requestProUpgrade } from "@/actions/subscription"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Check } from "lucide-react"

interface SubscriptionSettingsFormProps {
  subscriptionTier: string
  trialStartsAt: Date | null
  trialEndsAt: Date | null
  proRequestStatus?: string | null
  // Referral props
  referralCode?: string | null
  referralRewardClaimed?: boolean
  successfulReferrals?: number
}

export function SubscriptionSettingsForm({
  subscriptionTier,
  trialStartsAt,
  trialEndsAt,
  proRequestStatus,
  referralCode,
  referralRewardClaimed = false,
  successfulReferrals = 0,
}: SubscriptionSettingsFormProps) {
  const router = useRouter()
  const [requesting, setRequesting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  // Pro granted via referral — track remaining days from proExpiry (trialEndsAt field)
  const now = new Date()
  const proExpiry = trialEndsAt ? new Date(trialEndsAt) : null
  const isReferralProActive =
    referralRewardClaimed &&
    proExpiry &&
    now < proExpiry

  let daysRemaining = 0
  if (isReferralProActive && proExpiry) {
    daysRemaining = Math.ceil((proExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  const isPro = subscriptionTier === "PRO" || subscriptionTier === "ENTERPRISE"

  const referralLink = referralCode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/register?ref=${referralCode}`
    : ""

  const whatsappShareText = referralCode
    ? encodeURIComponent(
        `🚀 I'm using Open-Invoice to manage my business invoices professionally. Join using my referral code *${referralCode}* and I get 1 month Pro free!\n\nSign up here: ${referralLink}`
      )
    : ""

  async function handleRequestPro() {
    setRequesting(true)
    const res = await requestProUpgrade()
    setRequesting(false)
    if (res.success) {
      toast.success(res.message)
      setDialogOpen(false)
      router.refresh()
    } else {
      toast.error(res.error)
    }
  }

  function handleCopyReferral() {
    if (!referralLink) return
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true)
      toast.success("Referral link copied!")
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <>
      {/* ── Subscription & Billing Card ── */}
      <Card className="glass border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            Subscription &amp; Billing
          </CardTitle>
          <CardDescription>
            Manage your account plan and limits.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Active Plan Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-white/5 bg-white/3 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Active Plan</div>
              <div className="text-xl font-bold flex items-center gap-2 text-slate-100">
                {subscriptionTier === "PRO" ? (
                  <>
                    <BadgeCheck className="w-5 h-5 text-indigo-400" /> Pro Plan
                  </>
                ) : subscriptionTier === "ENTERPRISE" ? (
                  <>
                    <BadgeCheck className="w-5 h-5 text-emerald-400" /> Enterprise Plan
                  </>
                ) : (
                  "Free Plan"
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isPro && (
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Subscription Active
                </span>
              )}

              {/* Show Pro expiry countdown if activated via referral */}
              {isReferralProActive && (
                <div className="text-right space-y-0.5">
                  <span className="text-xs font-bold text-indigo-400 bg-indigo-500/15 border border-indigo-500/20 px-3 py-1 rounded-full">
                    {daysRemaining} {daysRemaining === 1 ? "day" : "days"} remaining
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Referral Pro expires: {proExpiry!.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Free plan info — nudge toward referral */}
          {!isPro && (
            <div className="p-3.5 rounded-lg border border-amber-500/10 bg-amber-500/5 text-slate-300 space-y-2 text-xs leading-normal">
              <p className="font-semibold text-amber-300 flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5" /> Want Pro for free?
              </p>
              <p className="text-slate-400">
                Refer a friend using your unique referral link. When they sign up, you instantly get
                <span className="text-amber-300 font-semibold"> 1 month of Pro (₹299 value)</span> — no payment required.
              </p>
              <p className="text-slate-500">
                Your referral link is shown below in the Referral Program section.
              </p>
            </div>
          )}
        </CardContent>

        {/* Upgrade footer — only for free users */}
        {!isPro && (
          <CardFooter className="border-t border-white/5 pt-4 flex justify-between items-center bg-white/1">
            <span className="text-xs text-slate-500">Need more features? Upgrade to Pro anytime.</span>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger render={
                <Button
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 h-8 text-xs font-semibold"
                />
              }>
                Upgrade to Pro
              </DialogTrigger>
              <DialogContent className="sm:max-w-[700px] border-white/10 bg-slate-950">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-indigo-400" /> Upgrade to Pro
                  </DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Unlock the full potential of Open-Invoice for your growing business.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-6 py-6">
                  <div className="space-y-4 p-4 rounded-xl border border-white/5 bg-slate-900/50">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-slate-300">Free Plan</h3>
                      <div className="text-2xl font-bold text-white">₹0<span className="text-sm font-normal text-slate-400">/month</span></div>
                    </div>
                    <ul className="space-y-3 text-sm text-slate-400">
                      <li className="flex gap-2"><AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" /> Max 5 Saved Invoices</li>
                      <li className="flex gap-2"><AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" /> 10 Document Generations / Day</li>
                      <li className="flex gap-2"><AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" /> Max 4 AI Chat Sessions</li>
                      <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> OpenWA &amp; Meta Integration</li>
                      <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> Standard Email Delivery</li>
                      <li className="flex gap-2"><AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" /> Single User Only</li>
                    </ul>
                  </div>
                  <div className="space-y-4 p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-indigo-500 text-[10px] font-bold px-2 py-1 uppercase rounded-bl-lg">Recommended</div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-indigo-300">Pro Plan</h3>
                      <div className="text-2xl font-bold text-white">₹299<span className="text-sm font-normal text-indigo-300/70">/month</span></div>
                    </div>
                    <ul className="space-y-3 text-sm text-slate-300">
                      <li className="flex gap-2"><Check className="w-4 h-4 text-indigo-400 shrink-0" /> <b>Unlimited</b> AI Generation</li>
                      <li className="flex gap-2"><Check className="w-4 h-4 text-indigo-400 shrink-0" /> <b>Unlimited</b> Invoices</li>
                      <li className="flex gap-2"><Check className="w-4 h-4 text-indigo-400 shrink-0" /> <b>Custom</b> PostgreSQL DB (BYODB)</li>
                      <li className="flex gap-2"><Check className="w-4 h-4 text-indigo-400 shrink-0" /> <b>Multi-User</b> Team Access</li>
                      <li className="flex gap-2"><Check className="w-4 h-4 text-indigo-400 shrink-0" /> <b>Priority</b> Email Support</li>
                    </ul>

                    {/* Referral shortcut inside the upgrade dialog */}
                    {referralCode && !referralRewardClaimed && (
                      <div className="mt-2 pt-3 border-t border-indigo-500/20">
                        <p className="text-xs text-amber-300 font-semibold mb-1">🎁 Get it free instead!</p>
                        <p className="text-[11px] text-slate-400">
                          Share your referral code <span className="font-mono text-amber-300">{referralCode}</span> with a friend.
                          When they sign up, you get 1 month Pro instantly.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter className="sm:justify-between items-center border-t border-white/10 pt-4">
                  <p className="text-xs text-slate-500">Contact us at admin@openinvoice.com for Enterprise pricing.</p>
                  {proRequestStatus === "PENDING" ? (
                    <Button disabled className="bg-indigo-600/50 text-indigo-200">
                      Request Pending Review
                    </Button>
                  ) : (
                    <Button
                      onClick={handleRequestPro}
                      disabled={requesting}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      {requesting ? "Submitting Request..." : "Request Pro Upgrade"}
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardFooter>
        )}
      </Card>

      {/* ── Referral Program Card ── */}
      {referralCode && (
        <Card className="glass border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-amber-500/8 blur-3xl pointer-events-none" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-400" />
              Referral Program
              {referralRewardClaimed && (
                <span className="ml-auto text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Reward Activated
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {referralRewardClaimed
                ? "You've already claimed your 1-month Pro reward from a referral."
                : "Refer a friend — they sign up, you get 1 month Pro (₹299 value) instantly. No payment needed."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stats */}
            <div className="flex gap-3">
              <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 flex-1">
                <Users className="h-4 w-4 text-amber-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Referrals</p>
                  <p className="text-lg font-bold text-amber-400">{successfulReferrals}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 flex-1">
                <Sparkles className="h-4 w-4 text-indigo-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Reward</p>
                  <p className="text-lg font-bold text-indigo-400">{referralRewardClaimed ? "Claimed ✓" : "1 mo Pro"}</p>
                </div>
              </div>
            </div>

            {/* Referral code */}
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
              <code className="flex-1 text-sm font-mono font-bold tracking-[0.25em] text-amber-300 select-all">
                {referralCode}
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

            {/* Enable Pro Free button — locked until earned */}
            <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-200">Enable Pro via Referral</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {referralRewardClaimed
                      ? "Your 1-month Pro reward is already active. Enjoy unlimited features!"
                      : "Share your link. When a friend signs up, Pro activates automatically — no admin approval."}
                  </p>
                </div>
                {referralRewardClaimed ? (
                  <span className="shrink-0 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Active
                  </span>
                ) : (
                  <Button
                    size="sm"
                    disabled
                    className="shrink-0 bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 cursor-not-allowed flex items-center gap-1.5 h-8 text-xs"
                    title="Share your referral link to earn this reward"
                  >
                    <Lock className="w-3 h-3" />
                    Enable Pro Free
                  </Button>
                )}
              </div>
              {!referralRewardClaimed && (
                <p className="text-[10px] text-slate-500">
                  🔒 Activates automatically when someone registers with your referral link — one-time reward per account.
                </p>
              )}
            </div>

            {/* Share buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-white/10 text-xs h-9 hover:bg-white/5"
                onClick={handleCopyReferral}
              >
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                Copy Link
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs h-9 font-semibold"
                onClick={() => window.open(`https://wa.me/?text=${whatsappShareText}`, "_blank")}
                disabled={!referralCode}
              >
                <Share2 className="w-3.5 h-3.5 mr-1.5" />
                Send to WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
