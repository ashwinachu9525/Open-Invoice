"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, Calendar, BadgeCheck, AlertTriangle, ShieldCheck, RefreshCcw } from "lucide-react"
import { startTrial } from "@/actions/trial"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface SubscriptionSettingsFormProps {
  subscriptionTier: string
  trialStartsAt: Date | null
  trialEndsAt: Date | null
}

export function SubscriptionSettingsForm({
  subscriptionTier,
  trialStartsAt,
  trialEndsAt,
}: SubscriptionSettingsFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const now = new Date()
  const endsDate = trialEndsAt ? new Date(trialEndsAt) : null
  const isTrialActive = endsDate && now < endsDate
  const isTrialExpired = endsDate && now >= endsDate

  // Calculate days remaining
  let daysRemaining = 0
  if (endsDate && isTrialActive) {
    const diffTime = endsDate.getTime() - now.getTime()
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  async function handleStartTrial() {
    setLoading(true)
    try {
      const res = await startTrial()
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(res.message || "Free trial activated!")
        router.refresh()
      }
    } catch {
      toast.error("Failed to start free trial.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="glass border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          Subscription & Billing
        </CardTitle>
        <CardDescription>
          Manage your account plans, limits, and free trials.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Badge Block */}
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
              ) : isTrialActive ? (
                <>
                  <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" /> Free Trial (Pro Features)
                </>
              ) : (
                "Free Plan"
              )}
            </div>
          </div>

          <div className="flex items-center">
            {subscriptionTier === "FREE" && !trialStartsAt && (
              <Button
                onClick={handleStartTrial}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 font-semibold h-9 text-xs"
              >
                {loading ? (
                  <>
                    <RefreshCcw className="w-3.5 h-3.5 animate-spin mr-1.5" /> Activating...
                  </>
                ) : (
                  "Try Pro Free for 30 Days"
                )}
              </Button>
            )}

            {(subscriptionTier === "PRO" || subscriptionTier === "ENTERPRISE") && (
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Subscription Active
              </span>
            )}

            {isTrialActive && (
              <div className="text-right sm:text-right space-y-0.5">
                <span className="text-xs font-bold text-blue-400 bg-blue-500/15 border border-blue-500/20 px-3 py-1 rounded-full">
                  {daysRemaining} {daysRemaining === 1 ? "day" : "days"} remaining
                </span>
                <p className="text-[10px] text-slate-400 mt-1">
                  Expires: {endsDate.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
            )}

            {isTrialExpired && subscriptionTier === "FREE" && (
              <span className="text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Trial Expired
              </span>
            )}
          </div>
        </div>

        {/* Informational Alerts */}
        {subscriptionTier === "FREE" && !trialStartsAt && (
          <div className="p-3.5 rounded-lg border border-indigo-500/10 bg-indigo-500/5 text-slate-300 space-y-2 text-xs leading-normal">
            <p className="font-semibold text-indigo-300">
              💡 Unlock the Trial & Experience Premium Features
            </p>
            <ul className="list-disc pl-4 space-y-1 text-slate-400">
              <li>No credit card required.</li>
              <li>Completely free trial.</li>
              <li>Automatically reverts to the Free limits after 30 days without any billing traps.</li>
              <li>Includes unlimited invoice creation and advanced AI insights.</li>
            </ul>
          </div>
        )}

        {isTrialActive && (
          <div className="p-3.5 rounded-lg border border-slate-500/10 bg-white/2 text-slate-300 text-xs leading-normal">
            <p className="text-slate-400">
              Your 30-day Free Trial is active. You currently have unrestricted access. Once the trial expires, you will revert back to the standard limits unless you choose to upgrade.
            </p>
          </div>
        )}

        {isTrialExpired && subscriptionTier === "FREE" && (
          <div className="p-3.5 rounded-lg border border-rose-500/10 bg-rose-500/5 text-slate-300 text-xs leading-normal">
            <p className="text-rose-300 font-semibold mb-1">
              Your 30-day free trial has expired
            </p>
            <p className="text-slate-400">
              To unlock unlimited invoice templates, automated quotations, and multi-user configurations, please upgrade your company account to the Pro subscription.
            </p>
          </div>
        )}
      </CardContent>
      {subscriptionTier === "FREE" && (
        <CardFooter className="border-t border-white/5 pt-4 flex justify-between items-center bg-white/1">
          <span className="text-xs text-slate-500">Need more features? Upgrade to Pro anytime.</span>
          <Button
            size="sm"
            onClick={() => {
              alert("Pro Upgrade Flow Initiated! (Stripe checkout would open here)")
            }}
            className="bg-indigo-600 hover:bg-indigo-700 h-8 text-xs font-semibold"
          >
            Upgrade to Pro
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
