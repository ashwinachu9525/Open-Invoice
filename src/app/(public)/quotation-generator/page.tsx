import { Metadata } from "next"
import { DocumentGeneratorForm } from "@/components/public/document-generator-form"

export const metadata: Metadata = {
  title: "Free Quotation Generator | Create Estimates Instantly",
  description: "Create professional quotations and estimates instantly for free. Add line items, calculate taxes, upload your logo, and download a PDF immediately. No signup required.",
}

export default function QuotationGeneratorPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-[1600px]">
      <div className="mb-8 text-center sm:text-left max-w-2xl">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 gradient-text">Free Quotation Generator</h1>
        <p className="text-lg text-muted-foreground">
          Create, preview, and download professional PDF quotations and estimates in seconds. Completely free to use. No account needed.
        </p>
      </div>

      <DocumentGeneratorForm defaultType="quotation" />
      
      {/* SEO Content Section */}
      <div className="mt-24 max-w-3xl mx-auto space-y-12 pb-12">
        <section>
          <h2 className="text-2xl font-bold mb-4">Win more clients with professional quotes</h2>
          <p className="text-muted-foreground mb-4">
            A professional quotation builds trust. Use our free tool to generate clean, easy-to-read PDF 
            estimates for your clients. Add your own logo and custom terms to seal the deal.
          </p>
        </section>
        
        <section>
          <h2 className="text-2xl font-bold mb-4">How it works</h2>
          <p className="text-muted-foreground mb-4">
            Just fill out the form above. The PDF is generated securely right inside your browser, meaning 
            none of your client data is saved to our servers. Once you're happy with the preview, click Download.
          </p>
        </section>
      </div>
    </div>
  )
}
