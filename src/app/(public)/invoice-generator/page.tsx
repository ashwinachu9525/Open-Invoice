import { Metadata } from "next"
import { DocumentGeneratorForm } from "@/components/public/document-generator-form"

export const metadata: Metadata = {
  title: "Free Invoice Generator | Create Invoices Instantly",
  description: "Create professional invoices instantly for free. Add line items, calculate taxes, upload your logo, and download a PDF immediately. No signup required.",
}

export default function InvoiceGeneratorPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-[1600px]">
      <div className="mb-8 text-center sm:text-left max-w-2xl">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 gradient-text">Free Invoice Generator</h1>
        <p className="text-lg text-muted-foreground">
          Create, preview, and download professional PDF invoices in seconds. Completely free to use. No account needed.
        </p>
      </div>

      <DocumentGeneratorForm defaultType="invoice" />
      
      {/* SEO Content Section */}
      <div className="mt-24 max-w-3xl mx-auto space-y-12 pb-12">
        <section>
          <h2 className="text-2xl font-bold mb-4">How to create a free invoice</h2>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li><strong>Add your details:</strong> Upload your company logo, name, and contact details.</li>
            <li><strong>Client information:</strong> Enter who you are billing.</li>
            <li><strong>Line items:</strong> Add products or services, quantities, prices, and tax rates.</li>
            <li><strong>Download:</strong> Click "Download PDF" to instantly save your professional invoice to your device.</li>
          </ul>
        </section>
        
        <section>
          <h2 className="text-2xl font-bold mb-4">Why use our free invoice maker?</h2>
          <p className="text-muted-foreground mb-4">
            Our free invoice generator runs entirely in your browser. This means your private financial data is 
            <strong> never saved to our servers </strong> when using the free tool. You get maximum privacy with a 
            professional design.
          </p>
          <p className="text-muted-foreground">
            If you want to save invoices for later, track payments, and maintain a customer database, you can 
            create a free account anytime.
          </p>
        </section>
      </div>
    </div>
  )
}
