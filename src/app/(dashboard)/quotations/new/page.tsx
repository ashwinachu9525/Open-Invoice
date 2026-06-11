import { getCustomers } from "@/actions/customer"
import { getNextQuotationNumber } from "@/actions/quotation"
import { getCompany } from "@/actions/company"
import { getCatalogItems } from "@/actions/catalog"
import { QuotationForm } from "@/components/forms/quotation-form"
import Link from "next/link"

export default async function NewQuotationPage() {
  const [customersData, quotationNumber, company, catalog] = await Promise.all([
    getCustomers({ limit: 1000 }),
    getNextQuotationNumber(),
    getCompany(),
    getCatalogItems(),
  ])
  const customers = customersData.customers

  if (customers.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">You need at least one customer to create a quotation.</p>
        <Link href="/customers/new" className="text-blue-600 hover:underline">
          Add a customer first
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Quotation</h1>
        <p className="text-gray-500">Create an estimate for your customer</p>
      </div>
      <QuotationForm
        customers={customers}
        defaultQuotationNumber={quotationNumber}
        sellerState={company?.state}
        catalogItems={catalog.items || []}
      />
    </div>
  )
}
