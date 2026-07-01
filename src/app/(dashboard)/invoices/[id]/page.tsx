import { getInvoice } from "@/actions/invoice"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { formatINR } from "@/services/tax-engine"
import Link from "next/link"
import { InvoiceActions } from "@/components/invoices/invoice-actions"
import { SendEmailButton } from "@/components/invoices/send-email-button"
import { SendWhatsappButton } from "@/components/invoices/send-whatsapp-button"
import { RecurringInvoiceModal } from "@/components/invoices/recurring-invoice-modal"
import { WhatsAppShareButton } from "@/components/invoices/whatsapp-share-button"
import { Download, Building2, User, FileText, AlertTriangle, Info, TrendingDown } from "lucide-react"
import { ComplianceButtons } from "@/components/invoices/compliance-buttons"
import QRCode from "qrcode"
import { PayOnlineButton } from "@/components/invoices/pay-online-button"

const statusConfig: Record<string, { label: string; class: string }> = {
  DRAFT:          { label: "Draft",          class: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
  SENT:           { label: "Sent",           class: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  VIEWED:         { label: "Viewed",         class: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
  PAID:           { label: "Paid",           class: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  OVERDUE:        { label: "Overdue",        class: "bg-red-500/20 text-red-400 border-red-500/30" },
  PARTIALLY_PAID: { label: "Partially Paid", class: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  CANCELLED:      { label: "Cancelled",      class: "bg-gray-500/15 text-gray-500 border-gray-500/20" },
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const invoice = await getInvoice(id)
  if (!invoice) return notFound()

  let upiQrCodeDataUrl = ""
  if ((invoice as any).paymentCollectionMethod === "UPI_QR" && (invoice as any).vpaAddress) {
    try {
      const payeeName = encodeURIComponent(invoice.company.name)
      const upiString = `upi://pay?pa=${(invoice as any).vpaAddress}&pn=${payeeName}&am=${invoice.balanceDue.toFixed(2)}&cu=${invoice.currency}&tn=Invoice-${invoice.invoiceNumber}`
      upiQrCodeDataUrl = await QRCode.toDataURL(upiString, { width: 180, margin: 1 })
    } catch (qrErr) {
      console.error("Failed to generate details page UPI QR:", qrErr)
    }
  }

  let razorpayKeyId = ""
  if (invoice.company.razorpayKeyId) {
    if (invoice.company.razorpayKeyId.includes(":")) {
      try {
        const { decrypt } = await import("@/lib/encryption")
        razorpayKeyId = decrypt(invoice.company.razorpayKeyId, invoice.company.id)
      } catch {
        razorpayKeyId = invoice.company.razorpayKeyId
      }
    } else {
      razorpayKeyId = invoice.company.razorpayKeyId
    }
  } else {
    razorpayKeyId = process.env.RAZORPAY_KEY_ID || ""
  }

  const isOverdue =
    invoice.status !== "PAID" &&
    invoice.status !== "CANCELLED" &&
    invoice.dueDate &&
    new Date(invoice.dueDate) < new Date()

  const status = statusConfig[invoice.status] ?? { label: invoice.status, class: "" }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{invoice.invoiceNumber}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${status.class}`}>
              {status.label}
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {invoice.customer.name} &middot; {new Date(invoice.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            {invoice.dueDate && (
              <> &middot; Due {new Date(invoice.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href={`/api/invoices/${invoice.id}/pdf`} target="_blank">
            <Button variant="outline" size="sm" className="glass border-white/10 hover:bg-white/8 gap-1.5">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </Link>
          {["DRAFT", "SENT", "VIEWED", "PARTIALLY_PAID"].includes(invoice.status) && (invoice as any).paymentCollectionMethod === "ONLINE" && (
            <PayOnlineButton
              invoiceId={invoice.id}
              amount={invoice.balanceDue}
              invoiceNumber={invoice.invoiceNumber}
              currency={invoice.currency}
              companyName={invoice.company.name}
              companyLogo={invoice.company.logo}
              customerName={invoice.customer.name}
              customerEmail={invoice.customer.email}
              customerPhone={invoice.customer.phone}
              razorpayKeyId={razorpayKeyId}
            />
          )}
          {invoice.status === "PAID" && (
            <Link href={`/api/invoices/${invoice.id}/receipt`} target="_blank">
              <Button variant="outline" size="sm" className="glass border-white/10 hover:bg-white/8 gap-1.5 text-emerald-400 border-emerald-500/20">
                <Download className="h-4 w-4" />
                Receipt PDF
              </Button>
            </Link>
          )}
          <ComplianceButtons 
            invoiceId={invoice.id} 
            showEInvoice={!!invoice.company.gstNumber} 
            showEWayBill={!!invoice.company.gstNumber && invoice.finalAmount >= 50000} 
          />
          {invoice.status !== "PAID" && (
            <Link href={`/invoices/${invoice.id}/edit`}>
              <Button variant="outline" size="sm" className="glass border-white/10 hover:bg-white/8 gap-1.5">
                Edit
              </Button>
            </Link>
          )}
          <SendEmailButton invoiceId={invoice.id} />
          <SendWhatsappButton 
            invoiceId={invoice.id}
            invoiceNumber={invoice.invoiceNumber}
            customerPhone={invoice.customer.phone}
            customerName={invoice.customer.name}
            companyName={invoice.company.name}
            pdfUrl={`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/invoices/${invoice.id}/pdf`}
          />
          <WhatsAppShareButton
            invoiceNumber={invoice.invoiceNumber}
            finalAmount={invoice.finalAmount}
            customerName={invoice.customer.name}
            pdfUrl={`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/invoices/${invoice.id}/pdf`}
          />
          <RecurringInvoiceModal 
            invoiceId={invoice.id} 
            existingSchedule={invoice.schedule ? {
              frequency: invoice.schedule.frequency,
              nextRunAt: invoice.schedule.nextRunAt,
              autoSend: invoice.schedule.autoSend,
              status: invoice.schedule.status
            } : null}
          />
          <InvoiceActions
            invoiceId={invoice.id}
            invoiceNumber={invoice.invoiceNumber}
            status={invoice.status}
            finalAmount={invoice.finalAmount}
            tdsPercentage={invoice.tdsPercentage}
          />
        </div>
      </div>

      {/* ── Payment QR Code Card ── */}
      {(invoice as any).paymentCollectionMethod === "UPI_QR" && (invoice as any).vpaAddress && ["SENT", "VIEWED", "PARTIALLY_PAID"].includes(invoice.status) && upiQrCodeDataUrl && (
        <div className="flex justify-start mb-6 animate-in fade-in duration-300">
          <div className="glass border-white/10 p-5 rounded-2xl flex flex-col items-center gap-3 text-center bg-black/20 max-w-xs shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Scan to Pay (UPI)</p>
            <div className="bg-white p-2.5 rounded-xl border border-white/10 shadow-inner">
              <img src={upiQrCodeDataUrl} className="w-36 h-36" alt="UPI QR" />
            </div>
            <p className="text-[11px] text-slate-300 font-medium">Scan with GPay, PhonePe, Paytm, or BHIM</p>
            <div className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1">
              <p className="font-mono text-[10px] text-indigo-400 font-semibold">{(invoice as any).vpaAddress}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Overdue Alert ── */}
      {isOverdue && (
        <Alert className="border-red-500/30 bg-red-500/10 animate-in fade-in duration-300">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertTitle className="text-red-400">Invoice Overdue</AlertTitle>
          <AlertDescription className="text-red-400/80 text-sm">
            This invoice was due on{" "}
            <strong>{new Date(invoice.dueDate!).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</strong>.
            Please follow up with the customer.
          </AlertDescription>
        </Alert>
      )}

      {/* ── Bill From / To ── */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="glass glass-card border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5" />
              Bill From
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-semibold text-base">{invoice.company.name}</p>
            {invoice.company.gstNumber && (
              <p className="text-muted-foreground font-mono text-xs">GSTIN: {invoice.company.gstNumber}</p>
            )}
            {invoice.company.address && (
              <p className="text-muted-foreground text-xs">{invoice.company.address}</p>
            )}
          </CardContent>
        </Card>
        <Card className="glass glass-card border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <User className="h-3.5 w-3.5" />
              Bill To
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-semibold text-base">{invoice.customer.name}</p>
            {invoice.customer.gstin && (
              <p className="text-muted-foreground font-mono text-xs">GSTIN: {invoice.customer.gstin}</p>
            )}
            {invoice.customer.address && (
              <p className="text-muted-foreground text-xs">{invoice.customer.address}</p>
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
                {invoice.items.map((item: any, i: number) => (
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
              <span>{formatINR(invoice.subTotal)}</span>
            </div>
            {invoice.cgstAmount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>CGST</span>
                <span>{formatINR(invoice.cgstAmount)}</span>
              </div>
            )}
            {invoice.sgstAmount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>SGST</span>
                <span>{formatINR(invoice.sgstAmount)}</span>
              </div>
            )}
            {invoice.igstAmount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>IGST</span>
                <span>{formatINR(invoice.igstAmount)}</span>
              </div>
            )}
            {invoice.tdsAmount > 0 && (
              <div className="flex justify-between text-orange-400">
                <span className="flex items-center gap-1">
                  <TrendingDown className="h-3.5 w-3.5" />
                  TDS ({invoice.tdsPercentage}%)
                </span>
                <span>-{formatINR(invoice.tdsAmount)}</span>
              </div>
            )}
            <Separator className="bg-white/15" />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span className="text-primary">{formatINR(invoice.finalAmount)}</span>
            </div>
            {invoice.amountPaid > 0 && (
              <>
                <div className="flex justify-between text-emerald-400">
                  <span>Paid</span>
                  <span>{formatINR(invoice.amountPaid)}</span>
                </div>
                <div className="flex justify-between font-semibold text-yellow-400">
                  <span>Balance Due</span>
                  <span>{formatINR(invoice.balanceDue)}</span>
                </div>
              </>
            )}
          </div>

          {/* TDS Info Alert */}
          {invoice.tdsAmount > 0 && (
            <Alert className="mt-4 border-orange-500/30 bg-orange-500/10">
              <Info className="h-4 w-4 text-orange-400" />
              <AlertTitle className="text-orange-400 text-sm">TDS Deducted</AlertTitle>
              <AlertDescription className="text-orange-400/80 text-xs">
                TDS of {invoice.tdsPercentage}% ({formatINR(invoice.tdsAmount)}) has been deducted. Ensure Form 16A / 26AS reconciliation.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* ── Activity Log ── */}
      {invoice.statusHistory && invoice.statusHistory.length > 0 && (
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

              {invoice.statusHistory.map((h: any, i: number) => {
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
