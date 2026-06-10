"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { resetPassword } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams.get("email")
  
  const [otp, setOtp] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isPending, setIsPending] = useState(false)

  if (!email) {
    return (
      <Card className="w-full max-w-md glass glass-card border-white/10 shadow-2xl">
        <CardContent className="pt-6 text-center space-y-4">
          <p className="text-sm text-red-400">Missing email address.</p>
          <Link href="/forgot-password" className="text-blue-500 hover:underline text-sm">
            Return to Forgot Password
          </Link>
        </CardContent>
      </Card>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (otp.length !== 6) {
      setError("OTP must be exactly 6 digits.")
      return
    }

    setIsPending(true)
    setError("")
    const result = await resetPassword(email!, otp, password, confirmPassword)
    setIsPending(false)
    if (result.error) {
      setError(result.error)
    } else {
      router.push("/login")
    }
  }

  return (
    <Card className="w-full max-w-md glass glass-card border-white/10 shadow-2xl">
      <CardHeader>
        <CardTitle>Set New Password</CardTitle>
        <CardDescription>Enter the 6-digit OTP sent to your email and your new password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-400 bg-red-400/10 p-2 rounded">{error}</p>}
          <div className="space-y-2">
            <Input
              type="text"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              className="text-center text-2xl tracking-widest h-14 font-mono glass border-white/10"
              required
            />
            <p className="text-xs text-muted-foreground text-center">6-digit OTP code</p>
          </div>
          <Input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="glass border-white/10 focus:border-primary/50"
            required
          />
          <Input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="glass border-white/10 focus:border-primary/50"
            required
          />
          <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isPending || otp.length !== 6}>
            {isPending ? "Resetting..." : "Reset Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Suspense fallback={<div className="h-24"></div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
