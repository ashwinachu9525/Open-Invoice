import { getCustomers } from "@/actions/customer"
import { getInvoice } from "@/actions/invoice"
import { getCompany } from "@/actions/company"
import { getBankAccounts } from "@/actions/bank-accounts"
import { getCatalogItems } from "@/actions/catalog"
import { InvoiceForm } from "@/components/forms/invoice-form"
import Link from "next/link"
import { redirect, notFound } from "next/navigation"


interface EditInvoicePageProps {
  params: Promise<{ id: string }>
}

export default async function EditInvoicePage({ params }: EditInvoicePageProps) {
  const { id } = await params
  
  const [customersData, invoice, company, bankAccounts, catalog] = await Promise.all([
    getCustomers({ limit: 1000 }),
    getInvoice(id),
    getCompany(),
    getBankAccounts(),
    getCatalogItems(),
  ])
  const customers = customersData.customers

  if (!invoice) return notFound()
  if (invoice.status === "PAID") return redirect(`/invoices/${id}`)

  if (customers.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">You need at least one customer to create an invoice.</p>
        <Link href="/customers/new" className="text-blue-600 hover:underline">
          Add a customer first
        </Link>
      </div>
    )
  }

  // Format existing items for the form
  const initialData = {
    customerId: invoice.customerId,
    invoiceNumber: invoice.invoiceNumber,
    date: invoice.date,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    exchangeRate: invoice.exchangeRate,
    taxJurisdiction: (invoice as any).taxJurisdiction || "INDIA_GST",
    tdsPercentage: invoice.tdsPercentage,
    tcsRate: invoice.tcsRate || 0,
    notes: invoice.notes || undefined,
    terms: invoice.terms || undefined,
    bankName: invoice.bankName || "",
    bankAccountName: invoice.bankAccountName || "",
    bankAccountNumber: invoice.bankAccountNumber || "",
    bankIfscCode: invoice.bankIfscCode || "",
    bankAccountType: invoice.bankAccountType || "",
    themeColor: invoice.themeColor || "#6366f1",
    themeFont: invoice.themeFont || "inter",
    items: invoice.items.map((item: any) => ({
      description: item.description,
      hsnSac: item.hsnSac || "",
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      taxPercentage: item.taxPercentage,
    }))
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Invoice</h1>
        <p className="text-muted-foreground">Update invoice details for {invoice.invoiceNumber}</p>
      </div>
      <InvoiceForm
        customers={customers}
        defaultInvoiceNumber={invoice.invoiceNumber}
        sellerState={company?.state}
        bankAccounts={bankAccounts}
        initialData={initialData}
        invoiceId={invoice.id}
        catalogItems={catalog.items || []}
      />
    </div>
  )
}
