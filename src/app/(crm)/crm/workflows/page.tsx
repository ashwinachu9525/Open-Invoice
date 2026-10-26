import { getCrmWorkflows, getCrmTeamMembers } from "@/actions/crm"
import { WorkflowStudio } from "@/components/crm/workflow-studio"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Workflow Studio | Visual CRM Automation",
  description: "Visual Trigger ➔ Conditions ➔ Actions builder for sales processes.",
}

export default async function WorkflowsPage() {
  const [wfResult, teamResult] = await Promise.all([
    getCrmWorkflows(),
    getCrmTeamMembers(),
  ])
  const workflows = wfResult.workflows || []
  const teamMembers = teamResult.members || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Workflow Studio</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visual Trigger ➔ Conditions ➔ Actions sales automation builder.
          </p>
        </div>
      </div>

      <WorkflowStudio initialWorkflows={workflows} teamMembers={teamMembers} />
    </div>
  )
}
