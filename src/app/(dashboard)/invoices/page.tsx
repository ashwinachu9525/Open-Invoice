import Link from "next/link"
import { getInvoices } from "@/actions/invoice"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatINR } from "@/services/tax-engine"
import { Plus, Sparkles, FileText, TrendingUp, Clock, CheckCircle2, AlertCircle, Trash2 } from "lucide-react"
import { InvoiceFilterBar } from "@/components/invoices/invoice-filter-bar"
import { InvoiceListClient } from "@/components/invoices/invoice-list-client"
import { Suspense } from "react"

export const dynamic = "force-dynamic"

const statusConfig: Record<string, { label: string; class: string }> = {
  DRAFT:          { label: "Draft",          class: "bg-gray-500/20 text-gray-400 border-gray-500/30 border" },
  SENT:           { label: "Sent",           class: "bg-blue-500/20 text-blue-400 border-blue-500/30 border" },
  VIEWED:         { label: "Viewed",         class: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30 border" },
  PAID:           { label: "Paid",           class: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 border" },
  OVERDUE:        { label: "Overdue",        class: "bg-red-500/20 text-red-400 border-red-500/30 border" },
  PARTIALLY_PAID: { label: "Partially Paid", class: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 border" },
  CANCELLED:      { label: "Cancelled",      class: "bg-gray-500/10 text-gray-500 border-gray-500/20 border" },
}

interface PageProps {
  searchParams: Promise<{
    from?: string
    to?: string
    fy?: string
    search?: string
    page?: string
  }>
}

export default async function InvoicesPage({ searchParams }: PageProps) {
  const { from, to, fy, search, page } = await searchParams
  const currentPage = Number(page) || 1
  const limit = 10

  const { invoices, totalPages, totalInvoices, stats } = await getInvoices({ 
    dateFrom: from, 
    dateTo: to,
    search,
    page: currentPage,
    limit,
  })

  const { totalAmount, paidCount, pendingCount, overdueCount } = stats

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Invoices
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Manage and track all your GST invoices</p>
        </div>
        <div className="flex gap-2">
          <Link href="/trash">
            <Button variant="outline" size="sm" className="glass border-white/10 hover:bg-white/8 gap-1.5 text-muted-foreground hover:text-red-400">
              <Trash2 className="h-4 w-4" />
              Trash
            </Button>
          </Link>
          <Link href="/ai">
            <Button variant="outline" size="sm" className="glass border-white/10 hover:bg-white/8 gap-1.5">
              <Sparkles className="h-4 w-4 text-violet-400" />
              AI Generate
            </Button>
          </Link>
          <Link href="/invoices/new">
            <Button size="sm" className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-lg gap-1.5">
              <Plus className="h-4 w-4" />
              New Invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <Suspense>
        <InvoiceFilterBar
          currentFrom={from}
          currentTo={to}
          currentFY={fy}
        />
      </Suspense>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Total Invoiced",
            value: formatINR(totalAmount),
            icon: TrendingUp,
            iconClass: "text-violet-400",
            bgClass: "bg-violet-500/10",
          },
          {
            label: "Paid",
            value: paidCount,
            icon: CheckCircle2,
            iconClass: "text-emerald-400",
            bgClass: "bg-emerald-500/10",
          },
          {
            label: "Pending",
            value: pendingCount,
            icon: Clock,
            iconClass: "text-blue-400",
            bgClass: "bg-blue-500/10",
          },
          {
            label: "Overdue",
            value: overdueCount,
            icon: AlertCircle,
            iconClass: "text-red-400",
            bgClass: "bg-red-500/10",
          },
        ].map((stat) => (
          <Card key={stat.label} className="glass glass-card border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.bgClass}`}>
                  <stat.icon className={`h-4 w-4 ${stat.iconClass}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="font-bold text-lg leading-tight">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Invoice Table ── */}
      <Card className="glass glass-card border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            {fy
              ? `Invoices — ${fy.replace("-", "–")}`
              : from || to
              ? `Invoices — ${from ?? "…"} to ${to ?? "…"}`
              : "All Invoices"}
            <span className="text-xs text-muted-foreground font-normal">{totalInvoices} total</span>
          </CardTitle>
        </CardHeader>
        <Separator className="bg-white/8" />
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-medium">No invoices found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {from || to || fy
                    ? "Try a different date range or clear the filter."
                    : "Create your first invoice to get started."}
                </p>
              </div>
              {!from && !to && !fy && (
                <Link href="/invoices/new">
                  <Button className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white gap-1.5">
                    <Plus className="h-4 w-4" />
                    Create Invoice
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <InvoiceListClient 
              invoices={invoices} 
              currentPage={currentPage} 
              limit={limit} 
              totalPages={totalPages} 
              totalInvoices={totalInvoices} 
              searchParamsProps={Object.fromEntries(Object.entries({ from, to, fy, search }).filter(([_, v]) => v)) as Record<string, string>}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
