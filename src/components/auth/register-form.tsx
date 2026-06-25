"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { registerSchema, RegisterFormValues } from "@/validations/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Checkbox } from "@/components/ui/checkbox"
import { registerUser } from "@/actions/auth"
import { signIn as nextAuthSignIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Gift, CheckCircle2 } from "lucide-react"
import { validateReferralCode } from "@/actions/referral"

export function RegisterForm({
  googleAuthEnabled = false,
  initialReferralCode = "",
}: {
  googleAuthEnabled?: boolean
  initialReferralCode?: string
}) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [isPending, setIsPending] = useState(false)
  const [referralValid, setReferralValid] = useState<boolean | null>(null)
  const [referralChecking, setReferralChecking] = useState(false)

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      terms: false,
      referralCode: initialReferralCode,
    },
  })

  // Auto-validate pre-filled referral code
  useEffect(() => {
    if (initialReferralCode) {
      checkReferralCode(initialReferralCode)
    }
  }, [initialReferralCode])

  async function checkReferralCode(code: string) {
    if (!code || code.trim().length < 4) {
      setReferralValid(null)
      return
    }
    setReferralChecking(true)
    try {
      const result = await validateReferralCode(code.trim().toUpperCase())
      setReferralValid(!!result)
    } catch {
      setReferralValid(null)
    } finally {
      setReferralChecking(false)
    }
  }

  async function onSubmit(data: RegisterFormValues) {
    setIsPending(true)
    setError("")
    try {
      const result = await registerUser({
        ...data,
        referralCode: data.referralCode?.trim().toUpperCase() || undefined,
      })
      if (result.error) {
        setError(result.error)
        setIsPending(false)
        return
      }
      window.location.assign(`/verify-email?email=${encodeURIComponent(data.email)}`)
    } catch (e) {
      setError("An unexpected error occurred. Please try again.")
      setIsPending(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@company.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Referral Code Field */}
        <FormField
          control={form.control}
          name="referralCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5 text-amber-400">
                <Gift className="w-3.5 h-3.5" />
                Referral Code
                <span className="text-xs text-muted-foreground font-normal">(optional)</span>
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    placeholder="INV-XXXXXXXX"
                    {...field}
                    value={field.value ?? ""}
                    className="uppercase pr-8 tracking-widest font-mono"
                    onChange={(e) => {
                      field.onChange(e)
                      checkReferralCode(e.target.value)
                    }}
                  />
                  {referralValid === true && (
                    <CheckCircle2 className="absolute right-2.5 top-2.5 h-4 w-4 text-emerald-500" />
                  )}
                  {referralValid === false && (
                    <span className="absolute right-2.5 top-2 text-lg text-rose-500">✗</span>
                  )}
                </div>
              </FormControl>
              {referralValid === true && (
                <p className="text-xs text-emerald-500 flex items-center gap-1 mt-1">
                  🎁 Valid referral! You and your friend will both get 1 month of Pro free.
                </p>
              )}
              {referralValid === false && (
                <p className="text-xs text-rose-500 mt-1">Invalid or already used referral code.</p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="terms"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-sm font-normal">
                  I agree to the <Link href="/terms" className="text-blue-600 hover:underline">Terms and Conditions</Link>
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full mt-4" disabled={isPending}>
          {isPending ? "Creating account..." : "Create Account"}
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

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </Form>
  )
}
