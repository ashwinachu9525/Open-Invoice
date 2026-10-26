import { getCrmReportsData } from "@/actions/crm"
import { ReportsView } from "@/components/crm/reports-view"

export const metadata = {
  title: "CRM Analytics & Forecasts | CRM Suite",
  description: "Sales conversion rates, representative leaderboard, and weighted pipeline forecasts.",
}

export default async function ReportsPage() {
  const result = await getCrmReportsData()
  const data = (result as any) || {
    leadSources: [],
    repLeaderboard: [],
    weightedForecast: 0,
    totalLeads: 0,
    totalDeals: 0,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Sales Performance & Forecasts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Conversion analytics, channel effectiveness, and probability-weighted revenue projections.
          </p>
        </div>
      </div>

      <ReportsView data={data} />
    </div>
  )
}
