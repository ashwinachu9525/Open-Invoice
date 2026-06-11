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

export function LoginForm() {
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
        window.location.assign("/dashboard")
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
      </form>
    </Form>
  )
}
