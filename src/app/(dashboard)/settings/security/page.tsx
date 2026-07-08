import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { MfaSettingsForm } from "@/components/forms/mfa-settings-form"
import { PasskeySettingsForm } from "@/components/forms/passkey-settings-form"
import { PrivacySettingsForm } from "@/components/forms/privacy-settings-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { redirect } from "next/navigation"

export default async function SecurityPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } })

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Security & Privacy</h1>
        <p className="text-gray-500 text-sm">Manage your sign-in methods and account security.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Authentication Methods</CardTitle>
          <CardDescription>
            Enhance your account security with MFA and Passkeys.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <MfaSettingsForm initialEnabled={dbUser?.mfaEnabled ?? false} />
          
          <div className="border-t border-white/5 pt-6">
            <PasskeySettingsForm 
              userId={session.user.id} 
              initialEnabled={dbUser?.passkeyEnabled ?? false} 
            />
          </div>
        </CardContent>
      </Card>

      <PrivacySettingsForm />
    </div>
  )
}
