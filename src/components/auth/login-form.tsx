"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { loginSchema, LoginFormValues } from "@/validations/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { signIn } from "next-auth/react"
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
  const isVerified = searchParams.get("verified") === "true"

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(data: LoginFormValues) {
    setIsPending(true)
    setError("")
    try {
      const result = await loginUser(data.email, data.password)
      setIsPending(false)
      if (result?.error) {
        setError(result.error)
        if (result.requiresVerification) {
          window.location.assign(`/verify-email?email=${encodeURIComponent(data.email)}`)
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
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Signing in..." : "Sign In"}
        </Button>
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
