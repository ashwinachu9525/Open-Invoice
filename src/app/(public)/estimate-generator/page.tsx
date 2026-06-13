import { Metadata } from "next"
import { DocumentGeneratorForm } from "@/components/public/document-generator-form"

export const metadata: Metadata = {
  title: "Free Estimate Generator | Create Estimates Online",
  description: "Create professional estimates online for free. Download PDFs instantly with no signup required.",
}

export default function EstimateGeneratorPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-[1600px]">
      <div className="mb-8 text-center sm:text-left max-w-2xl">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 gradient-text">Free Estimate Generator</h1>
        <p className="text-lg text-muted-foreground">
          Create, preview, and download professional PDF estimates in seconds. Completely free to use. No account needed.
        </p>
      </div>

      <DocumentGeneratorForm defaultType="estimate" />
      
      {/* SEO Content Section */}
      <div className="mt-24 max-w-3xl mx-auto space-y-12 pb-12">
        <section>
          <h2 className="text-2xl font-bold mb-4">Provide clear estimates</h2>
          <p className="text-muted-foreground mb-4">
            Give your potential clients a clear breakdown of costs before starting a project. 
            Our estimate maker helps you format everything professionally in seconds.
          </p>
        </section>
      </div>
    </div>
  )
}
