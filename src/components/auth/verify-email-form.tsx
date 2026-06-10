"use client"

import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { verifyEmail } from "@/actions/auth"
import Link from "next/link"

export function VerifyEmailForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams.get("email")

  const [otp, setOtp] = useState("")
  const [error, setError] = useState("")
  const [isPending, setIsPending] = useState(false)

  if (!email) {
    return (
      <div className="text-center space-y-4">
        <p className="text-sm text-red-400">Missing email address.</p>
        <Link href="/register" className="text-blue-500 hover:underline text-sm">
          Return to Registration
        </Link>
      </div>
    )
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (otp.length !== 6) {
      setError("OTP must be exactly 6 digits.")
      return
    }

    setIsPending(true)
    setError("")
    
    const result = await verifyEmail(email!, otp)
    
    if (result.error) {
      setError(result.error)
      setIsPending(false)
      return
    }

    // Redirect to login page upon success
    router.push("/login?verified=true")
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-500/10 border border-red-500/20 p-2 rounded">{error}</p>}
      
      <p className="text-sm text-center text-muted-foreground mb-4">
        We sent an email to <span className="font-semibold text-white">{email}</span>
      </p>

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
      </div>

      <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isPending || otp.length !== 6}>
        {isPending ? "Verifying..." : "Verify Email"}
      </Button>

      <p className="text-xs text-center text-muted-foreground mt-4">
        Didn't receive the email? Check your spam folder.
      </p>
    </form>
  )
}
