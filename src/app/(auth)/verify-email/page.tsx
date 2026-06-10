import { Suspense } from "react"
import { VerifyEmailForm } from "@/components/auth/verify-email-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MailCheck } from "lucide-react"

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass glass-card border-white/10 shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <MailCheck className="h-10 w-10 text-indigo-500" />
          </div>
          <CardTitle>Verify your email</CardTitle>
          <CardDescription>Enter the 6-digit code sent to your email.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-24"></div>}>
            <VerifyEmailForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
