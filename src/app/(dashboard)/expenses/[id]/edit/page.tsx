import { ExpenseForm } from "@/components/forms/expense-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft, Edit } from "lucide-react"
import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { getExpenseById } from "@/actions/expense"

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  if (session.user.role === "STAFF") {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground mt-2">You do not have permission to edit expenses.</p>
      </div>
    )
  }

  const { id } = await params
  const expense = await getExpenseById(id)
  
  if (!expense) return notFound()

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
            <Edit className="h-5 w-5 text-indigo-400" />
            Edit Expense
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Update your expense details and receipt.
          </p>
        </div>
      </div>

      <Card className="glass glass-card border-white/10">
        <CardHeader className="pb-4">
          <CardTitle className="text-base text-slate-200">Expense Details</CardTitle>
          <CardDescription>Update the amount, category, or receipt.</CardDescription>
        </CardHeader>
        <CardContent>
          <ExpenseForm initialData={expense} expenseId={expense.id} />
        </CardContent>
      </Card>
    </div>
  )
}
