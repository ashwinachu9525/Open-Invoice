import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { DashboardSettingsForm } from "@/components/forms/dashboard-settings-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { redirect } from "next/navigation"

export default async function DashboardSettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { dashboardConfig: true },
  })

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Layout</h1>
        <p className="text-gray-500 text-sm">Customize which widgets appear on your dashboard.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Widgets & Charts</CardTitle>
          <CardDescription>
            Toggle the switches below to show or hide specific components on your personal dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DashboardSettingsForm initialData={user?.dashboardConfig} />
        </CardContent>
      </Card>
    </div>
  )
}
