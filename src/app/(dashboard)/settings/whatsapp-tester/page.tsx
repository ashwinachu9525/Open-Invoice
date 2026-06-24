import { getCompany } from "@/actions/company"
import { getWhatsAppStatus } from "@/actions/integrations"
import { WhatsAppTesterForm } from "@/components/forms/whatsapp-tester-form"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function WhatsAppTesterPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  if (session?.user?.role === "STAFF") {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground mt-2">You do not have permission to view this page.</p>
      </div>
    )
  }

  const [company, waStatus] = await Promise.all([
    getCompany(),
    getWhatsAppStatus(),
  ])

  if (!company) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-bold text-rose-500">Error</h2>
        <p className="text-muted-foreground mt-2">Company profile not found.</p>
      </div>
    )
  }

  const isConnected = waStatus.status === "CONNECTED" || !!waStatus.connected

  return (
    <WhatsAppTesterForm
      sessionName={company.id}
      phoneNumber={waStatus.phone || null}
      isConnected={isConnected}
    />
  )
}
