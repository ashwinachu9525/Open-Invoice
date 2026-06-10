import { getExpenses, deleteExpense } from "@/actions/expense"
import { getCompany } from "@/actions/company"
import Link from "next/link"
import { Plus, Receipt, Trash2, Calendar, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"

export default async function ExpensesPage() {
  const expenses = await getExpenses()
  const company = await getCompany()
  
  const baseCurrency = company?.baseCurrency || "INR"

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground mt-1">Track your company expenses and receipts.</p>
        </div>
        <Link href="/expenses/new">
          <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        </Link>
      </div>

      <div className="grid gap-6">
        {expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-white/20 rounded-2xl glass text-center">
            <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <Receipt className="h-8 w-8 text-white/40" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No expenses recorded</h3>
            <p className="text-muted-foreground max-w-sm">
              Keep track of your outgoings by recording your first expense.
            </p>
            <Link href="/expenses/new" className="mt-6">
              <Button variant="outline" className="glass border-white/10 hover:bg-white/8 gap-2">
                <Plus className="h-4 w-4" /> Record Expense
              </Button>
            </Link>
          </div>
        ) : (
          <div className="glass glass-card border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-white/5 border-b border-white/10 text-muted-foreground">
                  <tr>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Category</th>
                    <th className="px-6 py-4 font-medium">Description</th>
                    <th className="px-6 py-4 font-medium text-right">Amount</th>
                    <th className="px-6 py-4 font-medium text-center">Receipt</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-500" />
                          <span>{new Date(expense.date).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {expense.description || "-"}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-200">
                        {formatCurrency(expense.amount, baseCurrency)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {expense.receiptUrl ? (
                          <a href={expense.receiptUrl} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1.5">
                            <FileText className="w-4 h-4" /> View
                          </a>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <form action={async () => {
                          "use server"
                          await deleteExpense(expense.id)
                        }}>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-500/10" type="submit">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
