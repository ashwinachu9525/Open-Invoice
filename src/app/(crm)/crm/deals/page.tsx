import { getCrmPipeline } from "@/actions/crm"
import { DealsPipelineView } from "@/components/crm/deals-pipeline-view"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Deals & Sales Pipeline | CRM Suite",
  description: "Custom sales stages, deal values, probability weighting, and revenue forecasts.",
}

export default async function DealsPage() {
  const result = await getCrmPipeline()
  const stages = result.stages || []
  const totalDeals = result.totalDeals || 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Deals & Sales Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track commercial opportunities through custom sales stages and monitor weighted revenue forecasts.
          </p>
        </div>
      </div>

      <DealsPipelineView initialStages={stages} totalDeals={totalDeals} />
    </div>
  )
}
