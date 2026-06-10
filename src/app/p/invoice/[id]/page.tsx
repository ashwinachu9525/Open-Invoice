import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Download, Building, Building2, Calendar, FileText } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

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

  // Update status if DRAFT to VIEWED? Public pages shouldn't change DRAFT to VIEWED maybe.
  // We'll leave it as is or update to VIEWED if it was SENT.
  if (invoice.status === "SENT") {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "VIEWED" },
    })
  }

  const { company, customer, items } = invoice

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Invoice {invoice.invoiceNumber}</h1>
            <p className="text-slate-500">From {company.name}</p>
          </div>
          <a href={`/api/invoices/${invoice.id}/pdf?public=true`} target="_blank" rel="noreferrer">
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm">
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
          </a>
        </div>

        {/* Invoice Body */}
        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
          <div className="h-2 w-full" style={{ backgroundColor: invoice.themeColor || "#1e40af" }} />
          <CardHeader className="px-8 pt-8 pb-4">
            <div className="flex justify-between items-start">
              <div className="space-y-4">
                {company.logo ? (
                  <img src={company.logo} alt={company.name} className="h-16 object-contain" />
                ) : (
                  <div className="h-16 w-16 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200">
                    <Building className="h-8 w-8 text-slate-400" />
                  </div>
                )}
                <div>
                  <CardTitle className="text-xl text-slate-900">{company.name}</CardTitle>
                  <CardDescription className="mt-1 space-y-1 text-slate-500">
                    {company.address && <p>{company.address}</p>}
                    {company.gstNumber && <p>GSTIN: {company.gstNumber}</p>}
                    {company.email && <p>{company.email}</p>}
                  </CardDescription>
                </div>
              </div>

              <div className="text-right space-y-4">
                <div className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium tracking-wide uppercase bg-slate-100 text-slate-600">
                  {invoice.status}
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-slate-500 flex items-center justify-end gap-2">
                    <FileText className="w-4 h-4" /> Invoice No: <span className="font-medium text-slate-900">{invoice.invoiceNumber}</span>
                  </p>
                  <p className="text-sm text-slate-500 flex items-center justify-end gap-2">
                    <Calendar className="w-4 h-4" /> Date: <span className="font-medium text-slate-900">{new Date(invoice.date).toLocaleDateString()}</span>
                  </p>
                  <p className="text-sm text-slate-500 flex items-center justify-end gap-2">
                    <Calendar className="w-4 h-4" /> Due: <span className="font-medium text-slate-900">{new Date(invoice.dueDate).toLocaleDateString()}</span>
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-8 pb-10">
            <div className="mt-8 pt-8 border-t border-slate-100">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Bill To
              </h3>
              <div className="space-y-1">
                <p className="text-lg font-medium text-slate-900">{customer.name}</p>
                {customer.companyName && <p className="text-slate-600">{customer.companyName}</p>}
                {customer.address && <p className="text-slate-500">{customer.address}</p>}
                {customer.gstin && <p className="text-slate-500">GSTIN: {customer.gstin}</p>}
              </div>
            </div>

            <div className="mt-10">
              <div className="rounded-2xl border border-slate-100 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-6 py-4 font-medium">Description</th>
                      <th className="px-6 py-4 font-medium text-right">Qty</th>
                      <th className="px-6 py-4 font-medium text-right">Rate</th>
                      <th className="px-6 py-4 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => (
                      <tr key={item.id} className="bg-white">
                        <td className="px-6 py-4 text-slate-900">
                          <p className="font-medium">{item.description}</p>
                          {item.hsnSac && <p className="text-xs text-slate-500 mt-0.5">HSN: {item.hsnSac}</p>}
                        </td>
                        <td className="px-6 py-4 text-right text-slate-600">{item.quantity}</td>
                        <td className="px-6 py-4 text-right text-slate-600">{formatCurrency(item.unitPrice, invoice.currency)}</td>
                        <td className="px-6 py-4 text-right font-medium text-slate-900">{formatCurrency(item.total, invoice.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <div className="w-full max-w-sm space-y-3 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-medium">{formatCurrency(invoice.subTotal, invoice.currency)}</span>
                </div>
                {invoice.totalTax > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Tax</span>
                    <span className="font-medium">{formatCurrency(invoice.totalTax, invoice.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-slate-900 pt-3 border-t border-slate-100">
                  <span>Total Due</span>
                  <span style={{ color: invoice.themeColor || "#1e40af" }}>
                    {formatCurrency(invoice.balanceDue, invoice.currency)}
                  </span>
                </div>
              </div>
            </div>

            {invoice.notes && (
              <div className="mt-12 pt-8 border-t border-slate-100">
                <h3 className="text-sm font-medium text-slate-900 mb-2">Notes</h3>
                <p className="text-slate-600 whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
