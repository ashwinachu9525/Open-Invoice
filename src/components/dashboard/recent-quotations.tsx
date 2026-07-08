"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatINR } from "@/services/tax-engine"
import { format } from "date-fns"
import Link from "next/link"
import { FilePlus, ChevronRight } from "lucide-react"

interface RecentQuotationsProps {
  quotations: {
    id: string
    quotationNumber: string
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
    case "ACCEPTED":
      colorClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      break
    case "REJECTED":
      colorClass = "bg-red-500/10 text-red-400 border-red-500/20"
      break
    case "EXPIRED":
      colorClass = "bg-orange-500/10 text-orange-400 border-orange-500/20"
      break
  }

  return (
    <Badge variant="outline" className={`text-[10px] uppercase tracking-wider font-semibold ${colorClass}`}>
      {status}
    </Badge>
  )
}

export function RecentQuotations({ quotations }: RecentQuotationsProps) {
  return (
    <Card className="glass glass-card border-white/10 overflow-hidden flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FilePlus className="w-4 h-4 text-purple-400" />
              Recent Quotations
            </CardTitle>
            <CardDescription className="text-xs mt-1">Latest 5 quotations created</CardDescription>
          </div>
          <Link href="/quotations" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center">
            View All <ChevronRight className="w-3 h-3 ml-0.5" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-2">
        {quotations.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-6 text-muted-foreground">
            <p className="text-sm">No quotations found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {quotations.map((quotation) => (
              <Link 
                href={`/quotations/${quotation.id}`}
                key={quotation.id} 
                className="flex items-center justify-between group p-2 -mx-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">{quotation.quotationNumber}</span>
                    <StatusBadge status={quotation.status} />
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{quotation.customer.name}</span>
                    <span>&middot;</span>
                    <span>{format(new Date(quotation.date), 'MMM d, yyyy')}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-foreground">
                    {formatINR(quotation.finalAmount)}
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
