import Link from "next/link"
import { getQuotations } from "@/actions/quotation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatINR } from "@/services/tax-engine"
import { Plus, FileSpreadsheet, TrendingUp, CheckCircle2, Clock, Trash2 } from "lucide-react"
import { QuotationFilterBar } from "@/components/quotations/quotation-filter-bar"
import { QuotationListClient } from "@/components/quotations/quotation-list-client"
import { Suspense } from "react"

interface PageProps {
  searchParams: Promise<{
    from?: string
    to?: string
    fy?: string
    search?: string
    page?: string
  }>
}

export default async function QuotationsPage({ searchParams }: PageProps) {
  const { from, to, fy, search, page } = await searchParams
  const currentPage = Number(page) || 1
  const limit = 10

  const { quotations, totalPages, totalQuotations, stats } = await getQuotations({ 
    dateFrom: from, 
    dateTo: to,
    search,
    page: currentPage,
    limit,
  })

  const { totalAmount = 0, acceptedCount = 0, pendingCount = 0 } = stats || {}

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            Quotations
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Create and manage your estimates</p>
        </div>
        <div className="flex gap-2">
          <Link href="/trash">
            <Button variant="outline" size="sm" className="glass border-white/10 hover:bg-white/8 gap-1.5 text-muted-foreground hover:text-red-400">
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Trash</span>
            </Button>
          </Link>
          <Link href="/quotations/new">
            <Button size="sm" className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-lg gap-1.5">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Quotation</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <Suspense>
        <QuotationFilterBar
          currentFrom={from}
          currentTo={to}
          currentFY={fy}
        />
      </Suspense>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          {
            label: "Total Estimated",
            value: formatINR(totalAmount),
            icon: TrendingUp,
            iconClass: "text-violet-400",
            bgClass: "bg-violet-500/10",
          },
          {
            label: "Accepted",
            value: acceptedCount,
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

      {/* ── Quotation Table ── */}
      <Card className="glass glass-card border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            {fy
              ? `Quotations — ${fy.replace("-", "–")}`
              : from || to
              ? `Quotations — ${from ?? "…"} to ${to ?? "…"}`
              : "All Quotations"}
            <span className="text-xs text-muted-foreground font-normal">{totalQuotations} total</span>
          </CardTitle>
        </CardHeader>
        <Separator className="bg-white/8" />
        <CardContent className="p-0">
          {quotations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
                <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-medium">No quotations found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {from || to || fy
                    ? "Try a different date range or clear the filter."
                    : "Create your first quotation to get started."}
                </p>
              </div>
              {!from && !to && !fy && (
                <Link href="/quotations/new">
                  <Button className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white gap-1.5">
                    <Plus className="h-4 w-4" />
                    Create Quotation
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <QuotationListClient 
              quotations={quotations} 
              currentPage={currentPage} 
              limit={limit} 
              totalPages={totalPages} 
              totalQuotations={totalQuotations} 
              searchParamsProps={Object.fromEntries(Object.entries({ from, to, fy, search }).filter(([_, v]) => v)) as Record<string, string>}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
