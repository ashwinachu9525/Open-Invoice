import { auth } from "@/auth"
import { PasskeySettingsForm } from "@/components/forms/passkey-settings-form"
import { MfaSettingsForm } from "@/components/forms/mfa-settings-form"
import { getCompany } from "@/actions/company"
import { getEmailSettings } from "@/actions/email-settings"
import { getDatabaseSettings } from "@/actions/database"
import { getBankAccounts } from "@/actions/bank-accounts"
import { CompanyForm } from "@/components/forms/company-form"
import { EmailSettingsForm } from "@/components/forms/email-settings-form"
import { DatabaseSettingsForm } from "@/components/forms/database-settings-form"
import { BankAccountsForm } from "@/components/forms/bank-accounts-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { InvoicePrefixForm } from "@/components/forms/invoice-prefix-form"
import { PushNotificationSettingsForm } from "@/components/forms/push-notifications-form"
import { PrivacySettingsForm } from "@/components/forms/privacy-settings-form"
import { AppearanceSettingsForm } from "@/components/forms/appearance-settings-form"
import { SubscriptionSettingsForm } from "@/components/forms/subscription-settings-form"
import { IntegrationsForm } from "@/components/forms/integrations-form"
import { getReferralData } from "@/actions/referral"

const isDevMode = process.env.NEXT_PUBLIC_ENV === "dev"

export default async function SettingsPage() {
  const session = await auth()
  const [company, emailSettings, databaseSettings, bankAccounts, dbUser, referralData] = await Promise.all([
    getCompany(),
    getEmailSettings(),
    isDevMode ? getDatabaseSettings() : Promise.resolve(null),
    getBankAccounts(),
    session?.user?.id ? import("@/lib/prisma").then(m => m.prisma.user.findUnique({ where: { id: session.user.id } })) : Promise.resolve(null),
    getReferralData(),
  ])

  const isStaff = session?.user?.role === "STAFF"

  if (isStaff) {
    return (
      <div className="flex flex-col gap-8 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-gray-500">Manage your user profile, authentication, and appearance.</p>
        </div>

        <Card className="glass border-white/10">
          <CardHeader>
            <CardTitle>Security &amp; Authentication</CardTitle>
            <CardDescription>
              Manage your sign-in methods and account security.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <MfaSettingsForm initialEnabled={dbUser?.mfaEnabled ?? false} />
            
            <div className="border-t border-white/5 pt-6">
              <PasskeySettingsForm 
                userId={session?.user?.id!} 
                initialEnabled={dbUser?.passkeyEnabled ?? false} 
              />
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-white/10">
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Enable push notifications on this device to stay updated on critical events.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PushNotificationSettingsForm />
          </CardContent>
        </Card>

        <Card className="glass border-white/10">
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize the theme and look of your dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AppearanceSettingsForm />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-gray-500">Manage your company profile and email configuration.</p>
      </div>

      {company && (
        <SubscriptionSettingsForm
          subscriptionTier={company.subscriptionTier}
          trialStartsAt={company.trialStartsAt}
          trialEndsAt={company.trialEndsAt}
          proRequestStatus={company.proRequestStatus}
          referralCode={referralData?.referralCode ?? null}
          referralRewardClaimed={referralData?.rewardClaimed ?? false}
          successfulReferrals={referralData?.successfulReferrals ?? 0}
        />
      )}

      {company && (
        <IntegrationsForm
          companyId={company.id}
          initialEnabled={company.openWaEnabled}
          initialUrl={company.openWaUrl}
          initialToken={company.openWaToken}
          initialProvider={company.whatsappProvider}
        />
      )}

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

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Enable push notifications on this device to stay updated on critical events.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PushNotificationSettingsForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customize the theme and look of your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AppearanceSettingsForm />
        </CardContent>
      </Card>

      {isDevMode && databaseSettings && (
        <Card>
          <CardHeader>
            <CardTitle>Database</CardTitle>
            <CardDescription>
              Choose SQLite for local package storage or PostgreSQL for production deployments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DatabaseSettingsForm
              currentProvider={databaseSettings.provider}
              currentUrl={databaseSettings.url}
              isSqlite={databaseSettings.isSqlite}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>AI Settings</CardTitle>
          <CardDescription>
            Configure your AI providers (Gemini, OpenAI, Nvidia) and API keys.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a href="/settings/ai" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
            Manage AI Settings
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Developer Settings</CardTitle>
          <CardDescription>
            Generate API keys, manage credentials, and build embeddable invoice widgets.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <a href="/settings/developer" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
            Open Developer Portal
          </a>
          <a href="/docs" target="_blank" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
            View API Docs (Swagger)
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Numbering</CardTitle>
          <CardDescription>
            Customize the prefix for your auto-generated invoice numbers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InvoicePrefixForm initialPrefix={company?.invoicePrefix} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Company Profile</CardTitle>
          <CardDescription>
            Update your business details. These appear on your invoices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CompanyForm initialData={company} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bank Accounts</CardTitle>
          <CardDescription>
            Manage your bank accounts. You can easily select them when generating new invoices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BankAccountsForm initialAccounts={bankAccounts} isPro={company?.subscriptionTier === "PRO" || company?.subscriptionTier === "ENTERPRISE"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Management</CardTitle>
          <CardDescription>
            Invite team members and manage their access roles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a href="/settings/team" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
            Manage Team
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email / SMTP Settings</CardTitle>
          <CardDescription>
            Configure SMTP to send invoices and reminders. Passwords are encrypted with AES-256.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmailSettingsForm initialData={emailSettings} />
        </CardContent>
      </Card>

      <PrivacySettingsForm />
    </div>
  )
}
