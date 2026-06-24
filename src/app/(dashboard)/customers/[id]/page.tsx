import { getCustomer } from "@/actions/customer"
import { notFound } from "next/navigation"
import { CustomerForm } from "@/components/forms/customer-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, User, FileDown } from "lucide-react"
import { getCustomerInteractions } from "@/actions/crm"
import { getCompany } from "@/actions/company"
import { CrmStatusPicker } from "@/components/crm/crm-status-picker"
import { CrmTimeline } from "@/components/crm/crm-timeline"

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const customer = await getCustomer(id)
  if (!customer) notFound()

  const [interactions, company] = await Promise.all([
    getCustomerInteractions(customer.id),
    getCompany(),
  ])

  const openWaEnabled = company?.openWaEnabled ?? false

  return (
    <div className="flex flex-col gap-6 max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/customers"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 glass hover:bg-white/8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Customer Profile & CRM
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Manage pipeline status and view interactions for <span className="font-medium text-foreground">{customer.name}</span>
            </p>
          </div>
        </div>
        <a href={`/api/customers/${customer.id}/statement`} target="_blank" rel="noreferrer">
          <Button variant="outline" className="glass border-white/10 hover:bg-white/8 gap-2">
            <FileDown className="h-4 w-4" />
            Download Statement
          </Button>
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* CRM Column */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="glass glass-card border-white/10 bg-white/2">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">CRM Lifecycle Pipeline</CardTitle>
              <CardDescription>Track the client's current stage in your business relationship.</CardDescription>
            </CardHeader>
            <CardContent>
              <CrmStatusPicker customerId={customer.id} currentStatus={customer.crmStatus} />
            </CardContent>
          </Card>

          <Card className="glass glass-card border-white/10 bg-white/2">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Interaction & Message Timeline</CardTitle>
              <CardDescription>Log client calls, email updates, private notes, and send WhatsApp reminders.</CardDescription>
            </CardHeader>
            <CardContent>
              <CrmTimeline 
                customerId={customer.id} 
                initialInteractions={interactions} 
                openWaEnabled={openWaEnabled} 
              />
            </CardContent>
          </Card>
        </div>

        {/* Customer Details Column */}
        <div className="lg:col-span-5">
          <Card className="glass glass-card border-white/10 bg-white/2">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Edit Details</CardTitle>
              <CardDescription>Update billing, tax, and contact information.</CardDescription>
            </CardHeader>
            <CardContent>
              <CustomerForm
                mode="edit"
                customerId={customer.id}
                defaultValues={{
                  name: customer.name,
                  companyName: customer.companyName ?? "",
                  gstin: customer.gstin ?? "",
                  pan: customer.pan ?? "",
                  email: customer.email ?? "",
                  phone: customer.phone ?? "",
                  address: customer.address ?? "",
                  state: customer.state ?? "",
                  country: customer.country ?? "India",
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
