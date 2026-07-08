"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatINR } from "@/services/tax-engine"
import { format } from "date-fns"
import Link from "next/link"
import { FileText, ChevronRight } from "lucide-react"

interface RecentInvoicesProps {
  invoices: {
    id: string
    invoiceNumber: string
    date: Date
    finalAmount: number
    status: string
    customer: { name: string }
  }[]
}

function StatusBadge({ status }: { status: string }) {
  let colorClass = "bg-slate-500/10 text-slate-400 border-slate-500/20"
  
  switch (status.toUpperCase()) {
    case "DRAFT":
      colorClass = "bg-slate-500/10 text-slate-400 border-slate-500/20"
      break
    case "SENT":
      colorClass = "bg-blue-500/10 text-blue-400 border-blue-500/20"
      break
    case "PAID":
      colorClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      break
    case "OVERDUE":
      colorClass = "bg-red-500/10 text-red-400 border-red-500/20"
      break
    case "PARTIALLY_PAID":
      colorClass = "bg-orange-500/10 text-orange-400 border-orange-500/20"
      break
    case "CANCELLED":
      colorClass = "bg-red-500/10 text-red-400 border-red-500/20"
      break
  }

  return (
    <Badge variant="outline" className={`text-[10px] uppercase tracking-wider font-semibold ${colorClass}`}>
      {status.replace("_", " ")}
    </Badge>
  )
}

export function RecentInvoices({ invoices }: RecentInvoicesProps) {
  return (
    <Card className="glass glass-card border-white/10 overflow-hidden flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              Recent Invoices
            </CardTitle>
            <CardDescription className="text-xs mt-1">Latest 5 invoices created</CardDescription>
          </div>
          <Link href="/invoices" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center">
            View All <ChevronRight className="w-3 h-3 ml-0.5" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-2">
        {invoices.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-6 text-muted-foreground">
            <p className="text-sm">No invoices found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <Link 
                href={`/invoices/${invoice.id}`}
                key={invoice.id} 
                className="flex items-center justify-between group p-2 -mx-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">{invoice.invoiceNumber}</span>
                    <StatusBadge status={invoice.status} />
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{invoice.customer.name}</span>
                    <span>&middot;</span>
                    <span>{format(new Date(invoice.date), 'MMM d, yyyy')}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-foreground">
                    {formatINR(invoice.finalAmount)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
