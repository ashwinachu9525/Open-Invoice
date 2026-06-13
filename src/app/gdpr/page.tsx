import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "GDPR Compliance",
  description: "Information regarding our compliance with the General Data Protection Regulation (GDPR).",
}

export default function GDPRPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border p-8 md:p-12">
        <Link 
          href="/" 
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Home
        </Link>
        
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-8">GDPR Compliance</h1>
        
        <div className="prose prose-blue max-w-none text-gray-700 space-y-6">
          <p className="lead text-lg text-gray-500">
            Invoice AI is fully committed to compliance with the General Data Protection Regulation (GDPR), which protects the data privacy rights of individuals within the European Union (EU) and European Economic Area (EEA).
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">1. Our Commitment</h2>
          <p>We respect your right to privacy. We ensure that all personal data is handled in accordance with the GDPR principles: lawfulness, fairness and transparency; purpose limitation; data minimization; accuracy; storage limitation; integrity and confidentiality.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">2. Your GDPR Rights</h2>
          <p>If you are a resident of the European Economic Area (EEA), you have the following data protection rights:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>The right to access, update or to delete:</strong> You can request access to, updating of, or deletion of your personal data directly within your account settings section.</li>
            <li><strong>The right of rectification:</strong> You have the right to have your information rectified if that information is inaccurate or incomplete.</li>
            <li><strong>The right to object:</strong> You have the right to object to our processing of your Personal Data.</li>
            <li><strong>The right of restriction:</strong> You have the right to request that we restrict the processing of your personal information.</li>
            <li><strong>The right to data portability:</strong> You have the right to be provided with a copy of the information we have on you in a structured, machine-readable and commonly used format.</li>
            <li><strong>The right to withdraw consent:</strong> You also have the right to withdraw your consent at any time where Invoice AI relied on your consent to process your personal information.</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">3. Data Processing and Storage</h2>
          <p>Your data is processed securely and is only accessible by authorized personnel. We use industry-standard encryption protocols to safeguard your information during transmission and at rest. If data is transferred outside of the EEA, we ensure appropriate safeguards are in place, such as Standard Contractual Clauses (SCCs).</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">4. Data Processing Agreement (DPA)</h2>
          <p>For our business customers who process data of EU citizens using our platform, we offer a standard Data Processing Agreement (DPA). To execute a DPA with us, please contact our support team.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">5. Exercising Your Rights</h2>
          <p>To exercise any of your GDPR rights, please contact our Data Protection Officer at ashwinachu9525@gmail.com. We will respond to your request within 30 days.</p>
        </div>
        
        <div className="mt-12 pt-8 border-t text-sm text-gray-500">
          Last Updated: June 13, 2026
        </div>
      </div>
    </div>
  )
}
