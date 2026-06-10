import { getCustomers } from "@/actions/customer"
import { getNextInvoiceNumber } from "@/actions/invoice"
import { getCompany } from "@/actions/company"
import { getBankAccounts } from "@/actions/bank-accounts"
import { InvoiceForm } from "@/components/forms/invoice-form"
import Link from "next/link"

export default async function NewInvoicePage() {
  const [customers, invoiceNumber, company, bankAccounts] = await Promise.all([
    getCustomers(),
    getNextInvoiceNumber(),
    getCompany(),
    getBankAccounts(),
  ])

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

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Invoice</h1>
        <p className="text-gray-500">Create a GST-compliant invoice</p>
      </div>
      <InvoiceForm
        customers={customers}
        defaultInvoiceNumber={invoiceNumber}
        sellerState={company?.state}
        bankAccounts={bankAccounts}
      />
    </div>
  )
}
