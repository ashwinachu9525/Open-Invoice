import { CustomerForm } from "@/components/forms/customer-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft, UserPlus } from "lucide-react"

export default function NewCustomerPage() {
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
            <UserPlus className="h-5 w-5 text-primary" />
            New Customer
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Add a new client to your invoice generator.</p>
        </div>
      </div>

      <Card className="glass glass-card border-white/10">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Customer Details</CardTitle>
          <CardDescription>Enter your customer&apos;s billing and tax details.</CardDescription>
        </CardHeader>
        <CardContent>
          <CustomerForm mode="create" />
        </CardContent>
      </Card>
    </div>
  )
}
