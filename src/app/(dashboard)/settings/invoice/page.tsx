import { getCompany } from "@/actions/company"
import { InvoiceSettingsForm } from "@/components/forms/invoice-settings-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function InvoiceSettingsPage() {
  const company = await getCompany()

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Invoice Settings</h1>
        <p className="text-gray-500 text-sm">Customize how your invoices look and behave.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Global Invoice Settings</CardTitle>
          <CardDescription>
            These settings will apply to all your newly created invoices and quotations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InvoiceSettingsForm initialData={company} />
        </CardContent>
      </Card>
    </div>
  )
}
