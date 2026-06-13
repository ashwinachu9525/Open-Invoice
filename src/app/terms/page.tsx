import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border p-8 md:p-12">
        <Link 
          href="/register" 
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Registration
        </Link>
        
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-8">Terms and Conditions</h1>
        
        <div className="prose prose-blue max-w-none text-gray-600 space-y-6">
          <p>
            Welcome to Open Invoice. By registering for an account, you agree to comply with and be bound by the following terms and conditions of use. Please review these terms carefully. If you do not agree to these terms, you should not register for an account or use this application.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. License and Permitted Use</h2>
          <p>
            Subject to your compliance with these Terms, you are granted a non-exclusive, non-transferable right to access and use the Open Invoice platform for your own personal use or internal business operations. You may not:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Resell, rent, lease, or distribute the platform as a commercial service.</li>
            <li>Use the platform to host a public SaaS (Software as a Service) for third parties in exchange for financial compensation.</li>
            <li>Remove or modify any copyright, trademark, or other proprietary rights notices.</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. User Accounts and Security</h2>
          <p>
            When you register for an account, you agree to provide accurate and complete information. You are solely responsible for maintaining the confidentiality of your account credentials, including any Passkeys or multi-factor authentication methods you configure. You agree to accept responsibility for all activities that occur under your account.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. Data Privacy and Content</h2>
          <p>
            You retain all rights to the data, invoices, customers, and content you generate or upload using the platform ("User Content"). By using the platform, you grant us a necessary license to store, process, and transmit your User Content solely for the purpose of providing the service to you. 
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4. Acceptable Use and Rate Limiting</h2>
          <p>
            You agree not to misuse the platform. Misuse includes, but is not limited to:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Attempting to bypass, disable, or interfere with security-related features or rate limits.</li>
            <li>Using the platform to generate spam, malicious files, or illegal content.</li>
            <li>Subjecting the infrastructure to unreasonable loads or automated bot networks.</li>
          </ul>
          <p>
            We reserve the right to enforce usage limits (such as AI chat limits or document generation quotas) depending on your application mode and subscription status.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5. Disclaimer of Warranties</h2>
          <p>
            THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DO NOT GUARANTEE THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, OR COMPLETELY SECURE.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">6. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. We will notify you of any significant changes by updating the terms on this page or through your account dashboard. Your continued use of the platform following the posting of changes constitutes your acceptance of such changes.
          </p>
        </div>
        
        <div className="mt-12 pt-8 border-t text-sm text-gray-500">
          Last Updated: {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  )
}
