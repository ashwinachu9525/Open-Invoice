"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Gift, Copy, CheckCheck, Share2, Users, Sparkles } from "lucide-react"
import { toast } from "sonner"

interface ReferralWidgetProps {
  referralCode: string
  rewardClaimed: boolean
  successfulReferrals: number
}

export function ReferralWidget({ referralCode, rewardClaimed, successfulReferrals }: ReferralWidgetProps) {
  const [copied, setCopied] = useState(false)

  const referralLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/register?ref=${referralCode}`
      : `/register?ref=${referralCode}`

  const whatsappText = encodeURIComponent(
    `🚀 Join Open-Invoice with my referral code *${referralCode}* and we both get 1 month of Pro features free!\n\nSign up here: ${referralLink}`
  )

  function handleCopy() {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true)
      toast.success("Referral link copied!")
      setTimeout(() => setCopied(false), 2500)
    })
  }

  function handleWhatsApp() {
    window.open(`https://wa.me/?text=${whatsappText}`, "_blank")
  }

  return (
    <Card className="glass glass-card border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent relative overflow-hidden">
      {/* Decorative glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Gift className="h-4 w-4 text-amber-400" />
          Refer &amp; Earn — 1 Month Pro Free
          {rewardClaimed && (
            <span className="ml-auto text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Reward Claimed
            </span>
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {rewardClaimed
            ? "You've already claimed your 1-month Pro reward. Keep sharing to help friends discover Open-Invoice!"
            : "Share your unique link. When a friend signs up, you and your friend both get 1 month of Pro (₹299 value) — free."}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats row */}
        <div className="flex gap-4">
          <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 flex-1">
            <Users className="h-4 w-4 text-amber-400" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Referrals</p>
              <p className="text-lg font-bold text-amber-400">{successfulReferrals}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 flex-1">
            <Gift className="h-4 w-4 text-emerald-400" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Reward</p>
              <p className="text-lg font-bold text-emerald-400">{rewardClaimed ? "1 mo ✓" : "1 mo Pro"}</p>
            </div>
          </div>
        </div>

        {/* Referral code display */}
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <code className="flex-1 text-sm font-mono font-bold tracking-[0.25em] text-amber-300 select-all">
            {referralCode}
          </code>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 hover:bg-amber-500/10 text-amber-400"
            onClick={handleCopy}
          >
            {copied ? <CheckCheck className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        {/* Share buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-white/10 text-xs h-9 hover:bg-white/5"
            onClick={handleCopy}
          >
            <Copy className="w-3.5 h-3.5 mr-1.5" />
            Copy Link
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs h-9 font-semibold"
            onClick={handleWhatsApp}
          >
            <Share2 className="w-3.5 h-3.5 mr-1.5" />
            Send to WhatsApp
          </Button>
        </div>

        {!rewardClaimed && (
          <p className="text-[10px] text-center text-muted-foreground">
            One-time reward · Pro activated instantly on signup · No admin approval needed
          </p>
        )}
      </CardContent>
    </Card>
  )
}
