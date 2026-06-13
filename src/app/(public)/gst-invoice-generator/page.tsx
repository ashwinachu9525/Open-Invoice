import { Metadata } from "next"
import { DocumentGeneratorForm } from "@/components/public/document-generator-form"

export const metadata: Metadata = {
  title: "Free GST Invoice Generator | Create GST Invoices Online",
  description: "Create professional GST compliant invoices instantly for free. Calculate CGST, SGST, IGST automatically. Download PDF immediately.",
}

export default function GSTInvoiceGeneratorPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-[1600px]">
      <div className="mb-8 text-center sm:text-left max-w-2xl">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 gradient-text">Free GST Invoice Generator</h1>
        <p className="text-lg text-muted-foreground">
          Create GST compliant invoices in seconds. Add your GSTIN, calculate tax percentages, and download a professional PDF. Completely free.
        </p>
      </div>

      <DocumentGeneratorForm defaultType="invoice" />
      
      {/* SEO Content Section */}
      <div className="mt-24 max-w-3xl mx-auto space-y-12 pb-12">
        <section>
          <h2 className="text-2xl font-bold mb-4">GST Compliance Made Easy</h2>
          <p className="text-muted-foreground mb-4">
            Just add your GSTIN in the Company Details section and your client's GSTIN in the Client Details section. 
            Specify the tax percentages for each line item, and the total tax will be calculated automatically.
          </p>
        </section>
      </div>
    </div>
  )
}
