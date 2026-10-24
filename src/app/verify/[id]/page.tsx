import { Metadata } from "next"
import { verifyInvoiceRecord } from "@/lib/invoice-verification"
import { VerificationView } from "@/components/verification/verification-view"
import { generateInvoicePdf } from "@/services/pdf"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ sig?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Verify Invoice ${id} - Open-Invoice Trust Network`,
    description: "Official cryptographic verification and document integrity portal for invoices.",
    robots: {
      index: false,
      follow: false,
    },
  }
}

export default async function VerifyInvoicePage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { sig } = await searchParams

  const result = await verifyInvoiceRecord(id, sig)

  // If the invoice was found but hasn't had its PDF hash computed yet, generate the PDF once to compute and cache it
  if (result.invoice && !result.invoice.pdfHash) {
    try {
      await generateInvoicePdf(result.invoice.id)
      // Re-fetch with populated pdfHash
      const refreshed = await verifyInvoiceRecord(id, sig)
      return (
        <VerificationView
          initialResult={refreshed}
          identifier={id}
          signature={sig}
        />
      )
    } catch (err) {
      console.warn("Could not pre-calculate PDF hash during verification view:", err)
    }
  }

  return (
    <VerificationView
      initialResult={result}
      identifier={id}
      signature={sig}
    />
  )
}
