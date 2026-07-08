import { auth } from "@/auth"
import { getCompany } from "@/actions/company"
import { CompanyForm } from "@/components/forms/company-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function SettingsPage() {
  const session = await auth()
  const company = await getCompany()

  const isStaff = session?.user?.role === "STAFF"

  if (isStaff) {
    return (
      <div className="flex flex-col gap-8 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
          <p className="text-gray-500">You are logged in as a staff member. Access your personal settings from the sidebar.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Company Profile</h1>
        <p className="text-gray-500 text-sm">Update your business details. These appear on your invoices.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>
            Basic details about your organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CompanyForm initialData={company} />
        </CardContent>
      </Card>
    </div>
  )
}
