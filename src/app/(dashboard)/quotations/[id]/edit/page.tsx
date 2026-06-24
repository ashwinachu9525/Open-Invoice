import { getCustomers } from "@/actions/customer"
import { getQuotation } from "@/actions/quotation"
import { getCompany } from "@/actions/company"
import { getCatalogItems } from "@/actions/catalog"
import { QuotationForm } from "@/components/forms/quotation-form"
import Link from "next/link"
import { redirect, notFound } from "next/navigation"

interface EditQuotationPageProps {
  params: Promise<{ id: string }>
}

export default async function EditQuotationPage({ params }: EditQuotationPageProps) {
  const { id } = await params
  
  const [customersData, quotation, company, catalog] = await Promise.all([
    getCustomers({ limit: 1000 }),
    getQuotation(id),
    getCompany(),
    getCatalogItems(),
  ])
  const customers = customersData.customers

  if (!quotation) return notFound()
  if (quotation.status === "INVOICED") return redirect(`/quotations/${id}`)

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

  // Format existing items for the form
  const initialData = {
    customerId: quotation.customerId,
    quotationNumber: quotation.quotationNumber,
    date: new Date(quotation.date),
    expiryDate: quotation.expiryDate ? new Date(quotation.expiryDate) : undefined,
    currency: quotation.currency,
    exchangeRate: quotation.exchangeRate,
    tdsPercentage: quotation.tdsPercentage,
    notes: quotation.notes || undefined,
    terms: quotation.terms || undefined,
    themeColor: quotation.themeColor || "#1e40af",
    themeFont: quotation.themeFont || "Helvetica",
    items: quotation.items.map((item: any) => ({
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
        <h1 className="text-3xl font-bold tracking-tight">Edit Quotation</h1>
        <p className="text-muted-foreground">Update estimate details for {quotation.quotationNumber}</p>
      </div>
      <QuotationForm
        customers={customers}
        defaultQuotationNumber={quotation.quotationNumber}
        sellerState={company?.state}
        initialData={initialData}
        quotationId={quotation.id}
        catalogItems={catalog.items || []}
      />
    </div>
  )
}
