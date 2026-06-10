import { getCustomer } from "@/actions/customer"
import { notFound } from "next/navigation"
import { CustomerForm } from "@/components/forms/customer-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft, User } from "lucide-react"

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const customer = await getCustomer(id)
  if (!customer) notFound()

  return (
    <div className="flex flex-col gap-6 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
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
            Edit Customer
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Update details for <span className="font-medium text-foreground">{customer.name}</span>
          </p>
        </div>
      </div>

      <Card className="glass glass-card border-white/10">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Customer Details</CardTitle>
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
  )
}
