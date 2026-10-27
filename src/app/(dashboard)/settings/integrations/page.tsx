import { getCompany } from "@/actions/company"
import { getEmailSettings } from "@/actions/email-settings"
import { IntegrationsForm } from "@/components/forms/integrations-form"
import { EmailSettingsForm } from "@/components/forms/email-settings-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function IntegrationsPage() {
  const company = await getCompany()
  const emailSettings = await getEmailSettings()

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-gray-500 text-sm">Connect Open-Invoice with external services like WhatsApp and Email.</p>
      </div>

      {company && (
        <IntegrationsForm
          companyId={company.id}
          initialEnabled={company.openWaEnabled}
          initialUrl={company.openWaUrl}
          initialToken={company.openWaToken}
          initialProvider={company.whatsappProvider}
          initialAiAutoReply={company.whatsappAiAutoReply}
          initialAutoCreateLeads={company.whatsappAutoCreateLeads}
          initialWebhookSecret={company.whatsappWebhookSecret}
        />
      )}

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
