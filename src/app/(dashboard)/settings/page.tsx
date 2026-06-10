import { getCompany } from "@/actions/company"
import { getEmailSettings } from "@/actions/email-settings"
import { getDatabaseSettings } from "@/actions/database"
import { getBankAccounts } from "@/actions/bank-accounts"
import { CompanyForm } from "@/components/forms/company-form"
import { EmailSettingsForm } from "@/components/forms/email-settings-form"
import { DatabaseSettingsForm } from "@/components/forms/database-settings-form"
import { BankAccountsForm } from "@/components/forms/bank-accounts-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const isDevMode = process.env.NEXT_PUBLIC_ENV === "dev"

export default async function SettingsPage() {
  const [company, emailSettings, databaseSettings, bankAccounts] = await Promise.all([
    getCompany(),
    getEmailSettings(),
    isDevMode ? getDatabaseSettings() : Promise.resolve(null),
    getBankAccounts(),
  ])

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-gray-500">Manage your company profile and email configuration.</p>
      </div>

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
          <BankAccountsForm initialAccounts={bankAccounts} />
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
    </div>
  )
}
