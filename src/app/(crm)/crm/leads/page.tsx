import { getLeads } from "@/actions/crm"
import { LeadsView } from "@/components/crm/leads-view"
import { AlertCircle } from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Leads Management | CRM Suite",
  description: "Capture, assign, qualify and convert leads into active customer deals.",
}

export default async function LeadsPage() {
  const result = await getLeads()
  const leads = result.leads || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Leads Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Capture, qualify, assign, and convert prospects into high-value customer accounts.
          </p>
        </div>
      </div>

      {result.error && (
        <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{result.error}</span>
        </div>
      )}

      <LeadsView initialLeads={leads} />
    </div>
  )
}
