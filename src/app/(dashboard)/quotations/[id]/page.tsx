import { getQuotation, convertToInvoice } from "@/actions/quotation"
import { notFound, redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { formatINR } from "@/services/tax-engine"
import { FileText, ArrowRight, Download, Building2, User } from "lucide-react"
import Link from "next/link"
import { QuotationActions } from "@/components/quotations/quotation-actions"
import { SendEmailButton } from "@/components/quotations/send-email-button"

const statusConfig: Record<string, { label: string; class: string }> = {
  DRAFT:          { label: "Draft",          class: "bg-gray-500/20 text-gray-400 border-gray-500/30 border" },
  SENT:           { label: "Sent",           class: "bg-blue-500/20 text-blue-400 border-blue-500/30 border" },
  ACCEPTED:       { label: "Accepted",       class: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 border" },
  REJECTED:       { label: "Rejected",       class: "bg-red-500/20 text-red-400 border-red-500/30 border" },
  EXPIRED:        { label: "Expired",        class: "bg-orange-500/20 text-orange-400 border-orange-500/30 border" },
  INVOICED:       { label: "Invoiced",       class: "bg-purple-500/20 text-purple-400 border-purple-500/30 border" },
}

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const quotation = await getQuotation(id)
  if (!quotation) notFound()

  async function convertAction() {
    "use server"
    const res = await convertToInvoice(id)
    if (res.success && res.invoiceId) {
      redirect(`/invoices/${res.invoiceId}`)
    }
  }

  const status = statusConfig[quotation.status] ?? { label: quotation.status, class: "" }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{quotation.quotationNumber}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${status.class}`}>
              {status.label}
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {quotation.customer.name} &middot; {new Date(quotation.date).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Link href={`/api/quotations/${quotation.id}/pdf`} target="_blank">
            <Button variant="outline" size="sm" className="glass border-white/10 hover:bg-white/8 gap-1.5">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </Link>
          
          {(quotation.status as string) !== "INVOICED" && (
            <Link href={`/quotations/${quotation.id}/edit`}>
              <Button variant="outline" size="sm" className="glass border-white/10 hover:bg-white/8 gap-1.5">
                Edit
              </Button>
            </Link>
          )}

          <SendEmailButton quotationId={quotation.id} />

          {(quotation.status as string) !== "INVOICED" && quotation.status !== "REJECTED" && (
            <form action={convertAction}>
              <Button disabled={(quotation.status as string) === "INVOICED"} type="submit" size="sm" className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-lg gap-1.5">
                Convert to Invoice
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          )}

          <QuotationActions
            quotationId={quotation.id}
            quotationNumber={quotation.quotationNumber}
            status={quotation.status as any}
          />
        </div>
      </div>

      {/* ── Bill From / To ── */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="glass glass-card border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5" />
              From
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-semibold text-base">{quotation.company.name}</p>
            {quotation.company.gstNumber && (
              <p className="text-muted-foreground font-mono text-xs">GSTIN: {quotation.company.gstNumber}</p>
            )}
            {quotation.company.address && (
              <p className="text-muted-foreground text-xs">{quotation.company.address}</p>
            )}
          </CardContent>
        </Card>
        <Card className="glass glass-card border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <User className="h-3.5 w-3.5" />
              To
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-semibold text-base">{quotation.customer.name}</p>
            {quotation.customer.gstin && (
              <p className="text-muted-foreground font-mono text-xs">GSTIN: {quotation.customer.gstin}</p>
            )}
            {quotation.customer.address && (
              <p className="text-muted-foreground text-xs">{quotation.customer.address}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Line Items ── */}
      <Card className="glass glass-card border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-primary" />
            Line Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</th>
                  <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Qty</th>
                  <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rate</th>
                  <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">GST%</th>
                  <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody>
                {quotation.items.map((item, i) => (
                  <tr key={item.id} className={`border-b border-white/5 hover:bg-white/3 transition-colors ${i % 2 === 0 ? "" : "bg-white/2"}`}>
                    <td className="py-3 pr-4 font-medium">{item.description}</td>
                    <td className="py-3 text-right text-muted-foreground">{item.quantity}</td>
                    <td className="py-3 text-right text-muted-foreground">{formatINR(item.unitPrice)}</td>
                    <td className="py-3 text-right text-muted-foreground">{item.taxPercentage}%</td>
                    <td className="py-3 text-right font-semibold">{formatINR(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Separator className="my-4 bg-white/8" />

          {/* Totals */}
          <div className="ml-auto max-w-xs space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatINR(quotation.subTotal)}</span>
            </div>
            {quotation.cgstAmount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>CGST</span>
                <span>{formatINR(quotation.cgstAmount)}</span>
              </div>
            )}
            {quotation.sgstAmount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>SGST</span>
                <span>{formatINR(quotation.sgstAmount)}</span>
              </div>
            )}
            {quotation.igstAmount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>IGST</span>
                <span>{formatINR(quotation.igstAmount)}</span>
              </div>
            )}
            <Separator className="bg-white/15" />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span className="text-primary">{formatINR(quotation.finalAmount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Activity Log ── */}
      {(quotation as any).statusHistory && (quotation as any).statusHistory.length > 0 && (
        <Card className="glass glass-card border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse inline-block" />
              Activity Log
            </CardTitle>
          </CardHeader>
          <Separator className="bg-white/8" />
          <CardContent className="pt-4">
            <div className="relative space-y-0">
              {/* Vertical line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-white/10" />

              {(quotation as any).statusHistory.map((h: any, i: number) => {
                const dt = new Date(h.createdAt)
                const dateStr = dt.toLocaleDateString("en-IN", {
                  day: "numeric", month: "short", year: "numeric",
                })
                const timeStr = dt.toLocaleTimeString("en-IN", {
                  hour: "2-digit", minute: "2-digit", hour12: true,
                })
                return (
                  <div key={h.id} className="flex items-start gap-4 pb-5 last:pb-0">
                    {/* Dot */}
                    <div className={`relative z-10 mt-0.5 h-3.5 w-3.5 rounded-full border-2 shrink-0 ${
                      i === 0
                        ? "border-primary bg-primary/30"
                        : "border-white/20 bg-background"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusConfig[h.status]?.class ?? ""}`}>
                          {statusConfig[h.status]?.label ?? h.status}
                        </span>
                        <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                          <span className="text-xs">{dateStr}</span>
                          <span className="text-[10px] bg-white/8 px-1.5 py-0.5 rounded font-mono">{timeStr}</span>
                        </div>
                      </div>
                      {h.note && (
                        <p className="text-xs text-muted-foreground mt-1.5 bg-white/4 rounded-lg px-3 py-2 border border-white/6 break-words">
                          {h.note}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
