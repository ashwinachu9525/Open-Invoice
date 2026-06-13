import Link from "next/link"
import { ChevronLeft, Mail } from "lucide-react"

export default function ContactPage() {
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
        
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-8">Contact Us</h1>
        
        <div className="prose prose-blue max-w-none text-gray-600 space-y-6 mb-12">
          <p>
            We're here to help! Whether you have a question about our features, pricing, or need technical support, 
            our team is ready to answer all your questions.
          </p>
        </div>

        <a 
          href="mailto:ashwinachu9525@gmail.com?subject=Support Request from Open Invoice" 
          className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm w-full sm:w-auto"
        >
          <Mail className="w-5 h-5" />
          Click to Send Email
        </a>
      </div>
    </div>
  )
}
