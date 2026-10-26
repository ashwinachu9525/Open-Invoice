import { getCrmPipeline } from "@/actions/crm"
import { CrmSettingsView } from "@/components/crm/crm-settings-view"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "CRM Settings | Pipeline Stages & Rules",
  description: "Configure custom stages, probability weighting, and automation rules.",
}

export default async function CrmSettingsPage() {
  const result = await getCrmPipeline()
  const stages = result.stages || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">CRM Settings & Custom Stages</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Customize deal stages, probabilities, visual colors, and integrated communication settings.
          </p>
        </div>
      </div>

      <CrmSettingsView initialStages={stages} />
    </div>
  )
}
