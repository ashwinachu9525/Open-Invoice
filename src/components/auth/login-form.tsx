"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { loginSchema, LoginFormValues } from "@/validations/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { signIn } from "next-auth/webauthn"
import { useRouter } from "next/navigation"
import { useState } from "react"
import Link from "next/link"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { loginUser } from "@/actions/auth"
import { signIn as nextAuthSignIn } from "next-auth/react"

export function LoginForm({ googleAuthEnabled = false }: { googleAuthEnabled?: boolean }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState("")
  const [isPending, setIsPending] = useState(false)
  const [hasPasskey, setHasPasskey] = useState(false)
  const [requiresMfa, setRequiresMfa] = useState(false)
  const [totpToken, setTotpToken] = useState("")
  const isVerified = searchParams.get("verified") === "true"

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const handleEmailBlur = async () => {
    const email = form.getValues("email")
    if (!email || !email.includes("@")) return
    try {
      const res = await fetch(`/api/auth/check-passkey?email=${encodeURIComponent(email)}`)
      const data = await res.json()
      setHasPasskey(!!data.enabled)
    } catch (e) {
      console.error(e)
    }
  }

  async function onSubmit(data: LoginFormValues) {
    setIsPending(true)
    setError("")
    try {
      const result = await loginUser(data.email, data.password, requiresMfa ? totpToken : undefined)
      setIsPending(false)
      if (result?.error) {
        if (result.requiresMfa) {
          setRequiresMfa(true)
          setError("") // Clear error to show MFA field cleanly
        } else {
          setError(result.error === "MFA_REQUIRED" ? "Please enter your authenticator code." : result.error)
          if (result.requiresVerification) {
            window.location.assign(`/verify-email?email=${encodeURIComponent(data.email)}`)
          }
        }
      } else {
        if (result?.role === "SUPER_ADMIN") {
          window.location.assign("/admin")
        } else {
          window.location.assign("/dashboard")
        }
      }
    } catch (e) {
      setError("An unexpected error occurred. Please try again.")
      setIsPending(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {isVerified && <p className="text-sm text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded text-center">Email verified successfully! You can now log in.</p>}
        {error && <p className="text-sm text-red-600 bg-red-500/10 border border-red-500/20 p-2 rounded">{error}</p>}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className={requiresMfa ? "hidden" : ""}>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@company.com" {...field} onBlur={(e) => { field.onBlur(); handleEmailBlur(); }} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className={requiresMfa ? "hidden" : ""}>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {requiresMfa && (
          <FormItem>
            <FormLabel>Authenticator Code</FormLabel>
            <FormControl>
              <Input 
                type="text" 
                placeholder="123456" 
                value={totpToken} 
                onChange={(e) => setTotpToken(e.target.value)} 
                maxLength={6} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
        <Button type="submit" className="w-full" disabled={isPending || (requiresMfa && totpToken.length < 6)}>
          {isPending ? "Signing in..." : requiresMfa ? "Verify Code" : "Sign In"}
        </Button>

        {googleAuthEnabled && (
          <>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or continue with</span>
              </div>
            </div>

            <Button 
              type="button" 
              variant="outline" 
              className="w-full" 
              onClick={() => nextAuthSignIn("google", { callbackUrl: "/dashboard" })}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </Button>
          </>
        )}

        {hasPasskey && (
          <Button 
            type="button" 
            variant="outline" 
            className="w-full border-blue-500/30 hover:bg-blue-500/10" 
            onClick={() => signIn("passkey", { action: "authenticate", email: form.getValues("email"), callbackUrl: "/dashboard" })}
          >
            Sign in with Passkey (Face ID / Touch ID)
          </Button>
        )}
        <div className="text-center text-sm text-gray-500 space-y-1">
          <Link href="/forgot-password" className="text-blue-600 hover:underline block">
            Forgot password?
          </Link>
          <span>
            No account?{" "}
            <Link href="/register" className="text-blue-600 hover:underline">
              Register
            </Link>
          </span>
        </div>

        {/* Referral nudge */}
        <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-center">
          <p className="text-xs text-amber-400 font-medium">
            🎁 Refer a friend &amp; get <span className="font-bold">1 month Pro free</span> (₹299 value)
          </p>
          <Link href="/register" className="text-xs text-amber-300 hover:underline">
            Create an account to get your referral link →
          </Link>
        </div>
      </form>
    </Form>
  )
}
