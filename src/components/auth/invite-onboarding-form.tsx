"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { submitInviteOnboarding, verifyInviteOtp } from "@/actions/invite-onboarding"
import { ShieldCheck, Mail, ArrowRight, Loader2, Check } from "lucide-react"

export function InviteOnboardingForm({ token, email, companyName, role }: {
  token: string
  email: string
  companyName: string
  role: string
}) {
  const router = useRouter()
  const [step, setStep] = useState<"onboard" | "verify" | "success">("onboard")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [otp, setOtp] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const roleLabel = role === "ADMIN" ? "Admin (Full Access)" : "Staff (Invoices Only)"

  async function handleOnboardSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!name || !password || !confirmPassword) {
      setError("All fields are required")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setLoading(true)
    const result = await submitInviteOnboarding({ token, name, password })
    setLoading(false)

    if (result?.error) {
      setError(result.error)
    } else {
      setStep("verify")
    }
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP")
      return
    }

    setLoading(true)
    const result = await verifyInviteOtp({ email, otp, token })
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setStep("success")
      // Auto login
      try {
        const loginRes = await signIn("credentials", {
          email,
          password,
          redirect: false,
        })
        if (loginRes?.error) {
          router.push("/login?verified=true&email=" + encodeURIComponent(email))
        } else {
          router.push("/dashboard")
        }
      } catch (err) {
        router.push("/login?verified=true&email=" + encodeURIComponent(email))
      }
    }
  }

  if (step === "success") {
    return (
      <div className="text-center py-6 space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
          <Check className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-slate-200">Onboarding Completed!</h3>
        <p className="text-xs text-muted-foreground">
          Logging you in and redirecting to your dashboard...
        </p>
        <Loader2 className="h-5 w-5 animate-spin mx-auto text-indigo-400" />
      </div>
    )
  }

  if (step === "verify") {
    return (
      <form onSubmit={handleOtpSubmit} className="space-y-4">
        <div className="text-center space-y-1.5 mb-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400">
            <Mail className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">Verify Email Address</h3>
          <p className="text-xs text-muted-foreground px-4">
            We sent a verification code to <span className="text-indigo-400 font-medium">{email}</span>.
          </p>
        </div>

        {error && <p className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 p-2 rounded">{error}</p>}

        <div className="space-y-1.5">
          <Label htmlFor="otp" className="text-xs text-slate-300">6-Digit Verification Code</Label>
          <Input
            id="otp"
            type="text"
            placeholder="123456"
            value={otp}
            maxLength={6}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            required
            className="glass border-white/10 text-center tracking-[0.5em] text-lg font-mono"
            disabled={loading}
          />
        </div>

        <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify & Log In"
          )}
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={handleOnboardSubmit} className="space-y-4">
      <div className="rounded-xl border border-white/5 bg-white/3 p-3.5 mb-2">
        <div className="flex items-start gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-200">Create Staff Account</h4>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              Set up your profile to join <span className="text-slate-300 font-semibold">{companyName}</span> as <span className="text-indigo-400 font-semibold">{roleLabel}</span>.
            </p>
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 p-2 rounded">{error}</p>}

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-xs text-slate-300">Email Address</Label>
        <Input
          id="email"
          type="email"
          value={email}
          disabled
          className="glass border-white/10 bg-slate-900/50 text-slate-400 select-none cursor-not-allowed"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="name" className="text-xs text-slate-300">Your Full Name</Label>
        <Input
          id="name"
          placeholder="John Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="glass border-white/10"
          disabled={loading}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-xs text-slate-300">Choose Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="glass border-white/10"
          disabled={loading}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword" className="text-xs text-slate-300">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="glass border-white/10"
          disabled={loading}
        />
      </div>

      <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating Profile...
          </>
        ) : (
          <>
            Register &amp; Continue
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  )
}
