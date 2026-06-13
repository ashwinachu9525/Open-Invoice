import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export default function PolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border p-8 md:p-12">
        <Link 
          href="/" 
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Home
        </Link>
        
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-8">Security Compliance</h1>
        
        <div className="prose prose-blue max-w-none text-gray-600 space-y-6">
          <p>
            This is the official Security Compliance for Open Invoice. We are currently updating our detailed legal documentation. 
            Please check back soon for the full text of our Security Compliance.
          </p>
          <p>
            If you have any immediate concerns regarding our Security Compliance, please contact our legal or support team through the Contact Us page.
          </p>
        </div>
        
        <div className="mt-12 pt-8 border-t text-sm text-gray-500">
          Last Updated: {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  )
}
