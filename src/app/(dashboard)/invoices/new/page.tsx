import { getCustomers } from "@/actions/customer"
import { getNextInvoiceNumber } from "@/actions/invoice"
import { getCompany } from "@/actions/company"
import { getBankAccounts } from "@/actions/bank-accounts"
import { getCatalogItems } from "@/actions/catalog"
import { InvoiceForm } from "@/components/forms/invoice-form"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function NewInvoicePage() {
  const [customersData, invoiceNumber, company, bankAccounts, catalog, pastInvoices] = await Promise.all([
    getCustomers({ limit: 1000 }),
    getNextInvoiceNumber(),
    getCompany(),
    getBankAccounts(),
    getCatalogItems(),
    prisma.invoice.findMany({
      where: { companyId: (await getCompany())?.id, deletedAt: null },
      orderBy: { date: "desc" },
      take: 5,
      include: {
        customer: { select: { name: true } },
        items: true,
      }
    })
  ])
  const customers = customersData.customers

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
        catalogItems={catalog.items || []}
        pastInvoices={pastInvoices}
        company={company}
      />
    </div>
  )
}
