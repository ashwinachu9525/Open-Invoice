"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { formatINR } from "@/services/tax-engine"
import { format } from "date-fns"
import Link from "next/link"
import { Banknote, ChevronRight, Tag } from "lucide-react"

interface RecentExpensesProps {
  expenses: {
    id: string
    date: Date
    amount: number
    category: string
    description: string | null
  }[]
}

export function RecentExpenses({ expenses }: RecentExpensesProps) {
  return (
    <Card className="glass glass-card border-white/10 overflow-hidden flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Banknote className="w-4 h-4 text-orange-400" />
              Recent Expenses
            </CardTitle>
            <CardDescription className="text-xs mt-1">Latest 5 expenses recorded</CardDescription>
          </div>
          <Link href="/expenses" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center">
            View All <ChevronRight className="w-3 h-3 ml-0.5" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-2">
        {expenses.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-6 text-muted-foreground">
            <p className="text-sm">No expenses found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {expenses.map((expense) => (
              <div 
                key={expense.id} 
                className="flex items-center justify-between group p-2 -mx-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Tag className="w-4 h-4 text-orange-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground capitalize">
                      {expense.category.replace(/_/g, " ")}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span className="truncate max-w-[120px] sm:max-w-[150px]">{expense.description || 'No description'}</span>
                      <span>&middot;</span>
                      <span>{format(new Date(expense.date), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <div className="text-sm font-bold text-foreground">
                    {formatINR(expense.amount)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
