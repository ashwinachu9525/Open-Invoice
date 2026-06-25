import { ExpenseForm } from "@/components/forms/expense-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft, Receipt } from "lucide-react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function NewExpensePage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  if (session.user.role === "STAFF") {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground mt-2">You do not have permission to record expenses.</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-6 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Link
          href="/expenses"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 glass hover:bg-white/8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="h-5 w-5 text-indigo-400" />
            Record Expense
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Add a new company expense and upload the receipt.
          </p>
        </div>
      </div>

      <Card className="glass glass-card border-white/10">
        <CardHeader className="pb-4">
          <CardTitle className="text-base text-slate-200">Expense Details</CardTitle>
          <CardDescription>Enter the amount, category, and optionally upload a receipt.</CardDescription>
        </CardHeader>
        <CardContent>
          <ExpenseForm />
        </CardContent>
      </Card>
    </div>
  )
}
