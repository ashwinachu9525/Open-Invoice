import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Download, Building, Building2, Calendar, FileText, CreditCard } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { ThemeToggle } from "@/components/dashboard/theme-toggle"

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      company: true,
      customer: true,
      items: true,
    },
  })

  if (!invoice) {
    notFound()
  }

  // Update status if SENT to VIEWED
  if (invoice.status === "SENT") {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "VIEWED" },
    })
  }

  const { company, customer, items } = invoice
  const isPaid = invoice.status === "PAID" || invoice.balanceDue <= 0
  const isOverdue = !isPaid && invoice.dueDate && new Date(invoice.dueDate) < new Date()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-6 sm:py-12 px-3 sm:px-6 lg:px-8 font-sans transition-colors duration-200">
      <div className="max-w-4xl mx-auto space-y-5 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header Actions Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 transition-colors">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Invoice {invoice.invoiceNumber}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isPaid
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : isOverdue
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                    : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
                }`}
              >
                {invoice.status}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Issued by <span className="font-semibold text-slate-700 dark:text-slate-300">{company.name}</span>
            </p>
          </div>

          <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2.5">
            <ThemeToggle />
            <a
              href={`/api/invoices/${invoice.id}/pdf?public=true`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 sm:flex-initial"
            >
              <Button className="w-full sm:w-auto gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm text-xs sm:text-sm h-9 sm:h-10">
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </Button>
            </a>
          </div>
        </div>

        {/* Invoice Card */}
        <Card className="border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none rounded-3xl overflow-hidden bg-white dark:bg-slate-900 transition-colors">
          {/* Top Brand Accent Bar */}
          <div className="h-2 w-full" style={{ backgroundColor: invoice.themeColor || "#4f46e5" }} />

          <CardHeader className="p-4 sm:p-8 pb-4 sm:pb-4 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
              {/* Company Info */}
              <div className="space-y-3 sm:space-y-4">
                {company.logo ? (
                  <img src={company.logo} alt={company.name} className="h-12 sm:h-16 object-contain max-w-[180px]" />
                ) : (
                  <div className="h-12 w-12 sm:h-16 sm:w-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-700">
                    <Building className="h-6 w-6 sm:h-8 sm:w-8 text-slate-400 dark:text-slate-500" />
                  </div>
                )}
                <div>
                  <CardTitle className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                    {company.name}
                  </CardTitle>
                  <CardDescription className="mt-1 space-y-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    {company.address && <p>{company.address}</p>}
                    {company.gstNumber && <p className="font-mono">GSTIN: {company.gstNumber}</p>}
                    {company.email && <p>{company.email}</p>}
                    {company.phone && <p>{company.phone}</p>}
                  </CardDescription>
                </div>
              </div>

              {/* Status & Key Dates */}
              <div className="w-full sm:w-auto flex flex-col sm:items-end space-y-3 bg-slate-50/80 dark:bg-slate-800/40 sm:bg-transparent sm:dark:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none">
                <div className="space-y-1.5 text-xs sm:text-sm w-full sm:w-auto">
                  <div className="flex items-center justify-between sm:justify-end gap-3 text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Invoice No:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{invoice.invoiceNumber}</span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Issue Date:</span>
                    <span className="font-medium text-slate-900 dark:text-slate-200">{new Date(invoice.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Due Date:</span>
                    <span className={`font-semibold ${isOverdue ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-slate-200"}`}>
                      {new Date(invoice.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-8 space-y-6 sm:space-y-8">
            {/* Bill To Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Bill To
              </h3>
              <div className="space-y-1 text-xs sm:text-sm">
                {(customer as any)?.showContactPersonName !== false ? (
                  <>
                    <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{customer.name}</p>
                    {customer.companyName && (
                      <p className="text-slate-600 dark:text-slate-300 font-medium">{customer.companyName}</p>
                    )}
                  </>
                ) : (
                  <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {customer.companyName || customer.name}
                  </p>
                )}
                {customer.address && <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{customer.address}</p>}
                {customer.gstin && <p className="text-slate-500 dark:text-slate-400 font-mono">GSTIN: {customer.gstin}</p>}
                {customer.email && <p className="text-slate-500 dark:text-slate-400">{customer.email}</p>}
              </div>
            </div>

            {/* Line Items Table with Horizontal Scroll on Mobile */}
            <div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm text-left min-w-[500px]">
                    <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 sm:px-6 py-3.5 font-semibold">Description</th>
                        <th className="px-3 sm:px-6 py-3.5 font-semibold text-right">Qty</th>
                        <th className="px-3 sm:px-6 py-3.5 font-semibold text-right">Unit Rate</th>
                        <th className="px-4 sm:px-6 py-3.5 font-semibold text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 sm:px-6 py-3.5 text-slate-900 dark:text-slate-100">
                            <p className="font-medium">{item.description}</p>
                            {item.hsnSac && (
                              <p className="text-[11px] text-slate-400 font-mono mt-0.5">HSN: {item.hsnSac}</p>
                            )}
                          </td>
                          <td className="px-3 sm:px-6 py-3.5 text-right text-slate-600 dark:text-slate-300 font-mono">{item.quantity}</td>
                          <td className="px-3 sm:px-6 py-3.5 text-right text-slate-600 dark:text-slate-300 font-mono">
                            {formatCurrency(item.unitPrice, invoice.currency)}
                          </td>
                          <td className="px-4 sm:px-6 py-3.5 text-right font-bold text-slate-900 dark:text-white font-mono">
                            {formatCurrency(item.total, invoice.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="flex justify-end">
              <div className="w-full sm:max-w-sm space-y-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Subtotal</span>
                  <span className="font-medium font-mono text-slate-900 dark:text-slate-200">
                    {formatCurrency(invoice.subTotal, invoice.currency)}
                  </span>
                </div>
                {invoice.totalDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Discount</span>
                    <span className="font-mono">-{formatCurrency(invoice.totalDiscount, invoice.currency)}</span>
                  </div>
                )}
                {invoice.totalTax > 0 && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Tax &amp; GST</span>
                    <span className="font-medium font-mono text-slate-900 dark:text-slate-200">
                      +{formatCurrency(invoice.totalTax, invoice.currency)}
                    </span>
                  </div>
                )}
                <div className="pt-2.5 border-t border-slate-200 dark:border-slate-700 flex justify-between text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  <span>Total Amount</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">
                    {formatCurrency(invoice.finalAmount, invoice.currency)}
                  </span>
                </div>
                {!isPaid && invoice.balanceDue > 0 && invoice.balanceDue !== invoice.finalAmount && (
                  <div className="flex justify-between text-xs font-semibold text-rose-600 dark:text-rose-400 pt-1">
                    <span>Remaining Balance Due</span>
                    <span className="font-mono">{formatCurrency(invoice.balanceDue, invoice.currency)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bank Transfer Details (if present) */}
            {invoice.bankName && invoice.bankAccountNumber && (
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                  Bank Remittance Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Bank</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{invoice.bankName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Account Number</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{invoice.bankAccountNumber}</span>
                  </div>
                  {invoice.bankIfscCode && (
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">IFSC Code</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{invoice.bankIfscCode}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {invoice.notes && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Notes</h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {invoice.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Public Footer */}
        <div className="text-center text-xs text-slate-400 dark:text-slate-500 space-y-1">
          <p>Powered by Open Invoice • Secure Document System</p>
        </div>
      </div>
    </div>
  )
}
