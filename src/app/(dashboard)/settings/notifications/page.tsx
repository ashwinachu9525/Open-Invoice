import { PushNotificationSettingsForm } from "@/components/forms/push-notifications-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function NotificationsPage() {
  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-gray-500 text-sm">Manage how you receive alerts and updates.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Push Notifications</CardTitle>
          <CardDescription>
            Enable push notifications on this device to stay updated on critical events.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PushNotificationSettingsForm />
        </CardContent>
      </Card>
    </div>
  )
}
