import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The rules, guidelines, and terms you agree to by using our application.",
}

export default function TermsOfServicePage() {
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
        
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-8">Terms of Service</h1>
        
        <div className="prose prose-blue max-w-none text-gray-700 space-y-6">
          <p className="lead text-lg text-gray-500">
            Welcome to Invoice AI. These Terms of Service ("Terms") govern your use of our website, applications, and services. By accessing or using our services, you agree to be bound by these Terms.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">1. Acceptance of Terms</h2>
          <p>By creating an account, accessing, or using Invoice AI ("Service"), you agree to comply with and be bound by these Terms. If you do not agree to these Terms, you may not use the Service.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">2. Account Registration and Responsibilities</h2>
          <p>To use certain features of the Service, you must register for an account. You agree to provide accurate, current, and complete information during the registration process. You are solely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must immediately notify us of any unauthorized use of your account or any other breach of security.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">3. Use of the Service</h2>
          <p>You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree not to use the Service:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>In any way that violates any applicable national or international law or regulation (including tax, invoicing, and accounting regulations).</li>
            <li>To engage in any fraudulent activity, including issuing fake or unauthorized invoices.</li>
            <li>To transmit, or procure the sending of, any advertising or promotional material, including any "junk mail," "chain letter," "spam," or any other similar solicitation.</li>
            <li>To impersonate or attempt to impersonate Invoice AI, a company employee, another user, or any other person or entity.</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">4. Intellectual Property Rights</h2>
          <p>The Service and its entire contents, features, and functionality (including but not limited to all information, software, text, displays, images, video, and audio, and the design, selection, and arrangement thereof) are owned by Invoice AI, its licensors, or other providers of such material and are protected by international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">5. User Data and Content</h2>
          <p>You retain all rights to your data and the content of the invoices you generate. By using our Service, you grant us a worldwide, non-exclusive, royalty-free license to host, copy, transmit, and display your data strictly as necessary for us to provide the Service to you.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">6. Termination</h2>
          <p>We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms. If you wish to terminate your account, you may simply discontinue using the Service or delete your account in your Account Settings.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">7. Limitation of Liability</h2>
          <p>In no event shall Invoice AI, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service; and (iii) unauthorized access, use or alteration of your transmissions or content.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">8. Changes to Terms</h2>
          <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any material changes by posting the new Terms on this page and updating the "Last Updated" date.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">9. Contact Us</h2>
          <p>If you have any questions about these Terms, please contact us at ashwinachu9525@gmail.com.</p>
        </div>
        
        <div className="mt-12 pt-8 border-t text-sm text-gray-500">
          Last Updated: June 13, 2026
        </div>
      </div>
    </div>
  )
}
