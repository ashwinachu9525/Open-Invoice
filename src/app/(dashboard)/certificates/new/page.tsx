import { Metadata } from "next"
import Link from "next/link"
import { getCustomers } from "@/actions/customer"
import {
  getInvoicesForCertificate,
  getNextCertificateNumber,
} from "@/actions/test-certificates"
import { CertificateForm } from "@/components/certificates/certificate-form"
import { Award, ArrowLeft } from "lucide-react"

export const metadata: Metadata = {
  title: "New Test Certificate | Open-Invoice",
  description: "Generate a new quality test certificate or COA",
}

interface NewCertificatePageProps {
  searchParams: Promise<{
    invoiceId?: string
    customerId?: string
  }>
}

export default async function NewCertificatePage({ searchParams }: NewCertificatePageProps) {
  const { invoiceId, customerId } = await searchParams

  const [customersData, invoices, nextCertNumber] = await Promise.all([
    getCustomers({ limit: 1000 }),
    getInvoicesForCertificate(),
    getNextCertificateNumber(),
  ])

  const customers = customersData.customers || []

  // Pre-resolve initial invoice and customer if passed via query params
  let initialCustomerId = customerId || ""
  let initialProductName = ""

  if (invoiceId) {
    const matchingInvoice = invoices.find((inv) => inv.id === invoiceId)
    if (matchingInvoice) {
      if (!initialCustomerId && matchingInvoice.customerId) {
        initialCustomerId = matchingInvoice.customerId
      }
      if (matchingInvoice.items && matchingInvoice.items.length > 0) {
        initialProductName = matchingInvoice.items[0].description
      }
    }
  }

  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
          <Award className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">No Customers Found</h2>
        <p className="text-sm text-muted-foreground mb-6">
          You need at least one customer/client in your directory before generating a test certificate.
        </p>
        <Link
          href="/customers/new"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md hover:from-blue-700 hover:to-indigo-700"
        >
          Add Customer First
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Award className="h-6 w-6 text-blue-400" />
          Generate Test Certificate
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Issue a quality assurance test certificate or certificate of analysis (COA)
        </p>
      </div>

      <CertificateForm
        customers={customers}
        invoices={invoices}
        defaultCertificateNumber={nextCertNumber}
        initialInvoiceId={invoiceId}
        initialCustomerId={initialCustomerId}
        initialProductName={initialProductName}
      />
    </div>
  )
}
