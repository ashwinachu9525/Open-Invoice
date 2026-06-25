import { auth } from "@/auth"
import { PasskeySettingsForm } from "@/components/forms/passkey-settings-form"
import { MfaSettingsForm } from "@/components/forms/mfa-settings-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { getSystemConfig, getSystemDiagnostics } from "@/actions/admin-tools"
import { SystemDiagnosticsPanel } from "@/components/admin/system-diagnostics-panel"

export default async function SuperAdminSettingsPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/login")

  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } })
  const config = await getSystemConfig()
  const diagnostics = await getSystemDiagnostics()

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Settings & Settings</h1>
        <p className="text-gray-500">Manage central global platform configuration, system diagnostics, and security.</p>
      </div>

      {/* System Configurations and Telemetry Diagnostics */}
      <SystemDiagnosticsPanel initialConfig={config} diagnostics={diagnostics} />

      {/* Security Credentials */}
      <Card>
        <CardHeader>
          <CardTitle>Security & Authentication</CardTitle>
          <CardDescription>
            Manage your sign-in methods and account security.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <MfaSettingsForm initialEnabled={dbUser?.mfaEnabled ?? false} />
          
          <div className="border-t pt-6">
            <PasskeySettingsForm 
              userId={session?.user?.id!} 
              initialEnabled={dbUser?.passkeyEnabled ?? false} 
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
