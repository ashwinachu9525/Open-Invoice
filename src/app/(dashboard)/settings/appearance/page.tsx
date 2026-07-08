import { AppearanceSettingsForm } from "@/components/forms/appearance-settings-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AppearancePage() {
  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Appearance</h1>
        <p className="text-gray-500 text-sm">Customize the theme and look of your dashboard.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appearance Settings</CardTitle>
          <CardDescription>
            Switch between light, dark, and system themes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AppearanceSettingsForm />
        </CardContent>
      </Card>
    </div>
  )
}
