import { getCrmActivities } from "@/actions/crm"
import { ActivitiesView } from "@/components/crm/activities-view"

export const metadata = {
  title: "Activities & Tasks | CRM Suite",
  description: "Schedule, log and complete calls, meetings, emails, and follow-up tasks.",
}

export default async function ActivitiesPage() {
  const result = await getCrmActivities()
  const activities = result.activities || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Activities & Task Center</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your daily calls, client meetings, follow-up emails, and action items.
          </p>
        </div>
      </div>

      <ActivitiesView initialActivities={activities} />
    </div>
  )
}
