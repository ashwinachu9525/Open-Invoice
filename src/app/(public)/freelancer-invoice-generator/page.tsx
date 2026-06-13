import { Metadata } from "next"
import { DocumentGeneratorForm } from "@/components/public/document-generator-form"

export const metadata: Metadata = {
  title: "Free Freelancer Invoice Generator | Create Invoices Online",
  description: "Create professional freelance invoices instantly for free. Download PDFs immediately. Perfect for designers, developers, writers, and consultants.",
}

export default function FreelancerInvoiceGeneratorPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-[1600px]">
      <div className="mb-8 text-center sm:text-left max-w-2xl">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 gradient-text">Freelancer Invoice Generator</h1>
        <p className="text-lg text-muted-foreground">
          Built for independent professionals. Create, preview, and download professional PDF invoices in seconds. Completely free to use.
        </p>
      </div>

      <DocumentGeneratorForm defaultType="invoice" />
      
      {/* SEO Content Section */}
      <div className="mt-24 max-w-3xl mx-auto space-y-12 pb-12">
        <section>
          <h2 className="text-2xl font-bold mb-4">Get paid faster</h2>
          <p className="text-muted-foreground mb-4">
            Send clear, professional invoices to your clients immediately after finishing your freelance work.
            Add your hourly rate or fixed project fees as line items and generate a beautiful PDF.
          </p>
        </section>
      </div>
    </div>
  )
}
