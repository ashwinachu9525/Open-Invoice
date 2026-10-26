import { getCrmCampaigns } from "@/actions/crm"
import { CampaignsView } from "@/components/crm/campaigns-view"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Email Campaigns & Lead Nurturing | CRM Suite",
  description: "Create targeted outreach campaigns and lead nurturing sequences.",
}

export default async function CampaignsPage() {
  const result = await getCrmCampaigns()
  const campaigns = result.campaigns || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Email Campaigns & Nurturing</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Automate targeted outbound communication, product announcements, and sales outreach.
          </p>
        </div>
      </div>

      <CampaignsView initialCampaigns={campaigns} />
    </div>
  )
}
