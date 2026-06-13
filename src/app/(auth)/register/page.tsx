import { RegisterForm } from "@/components/auth/register-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText } from "lucide-react"

export default function RegisterPage() {
  const googleAuthEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass glass-card border-white/10 shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <FileText className="h-10 w-10 text-blue-600" />
          </div>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>Start invoicing in minutes</CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm googleAuthEnabled={googleAuthEnabled} />
        </CardContent>
      </Card>
    </div>
  )
}
