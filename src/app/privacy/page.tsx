import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Our commitment to protecting your privacy and personal data.",
}

export default function PrivacyPolicyPage() {
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
        
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-8">Privacy Policy</h1>
        
        <div className="prose prose-blue max-w-none text-gray-700 space-y-6">
          <p className="lead text-lg text-gray-500">
            At Invoice AI, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our SaaS invoicing application.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">1. Information We Collect</h2>
          <p>We collect information that you voluntarily provide to us when you register on the Services, express an interest in obtaining information about us or our products and Services, when you participate in activities on the Services, or otherwise when you contact us.</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Personal Information:</strong> Names, phone numbers, email addresses, mailing addresses, usernames, and passwords.</li>
            <li><strong>Business Information:</strong> Company name, tax identification numbers (like GSTIN), financial data necessary for invoicing, and customer lists.</li>
            <li><strong>Authentication Data:</strong> Passwords, password hints, OAuth tokens (if you use Google/Apple Sign-In), and similar security information used for authentication and account access.</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">2. How We Use Your Information</h2>
          <p>We use personal information collected via our Services for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations.</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>To facilitate account creation and logon process.</li>
            <li>To fulfill and manage your business operations (e.g., generating and sending invoices to your clients).</li>
            <li>To send administrative information to you, such as product, service, and new feature information and/or information about changes to our terms, conditions, and policies.</li>
            <li>To request feedback and to contact you about your use of our Services.</li>
            <li>To protect our Services (e.g., fraud monitoring and prevention).</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">3. Will Your Information Be Shared With Anyone?</h2>
          <p>We only share and disclose your information in the following situations:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Compliance with Laws:</strong> We may disclose your information where we are legally required to do so in order to comply with applicable law, governmental requests, a judicial proceeding, court order, or legal process.</li>
            <li><strong>Vital Interests and Legal Rights:</strong> We may disclose your information where we believe it is necessary to investigate, prevent, or take action regarding potential violations of our policies, suspected fraud, situations involving potential threats to the safety of any person and illegal activities, or as evidence in litigation in which we are involved.</li>
            <li><strong>Third-Party Service Providers:</strong> We may share your data with third-party vendors, service providers, contractors or agents who perform services for us or on our behalf and require access to such information to do that work (e.g., payment processing via Stripe, email delivery, hosting services).</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">4. Is Your Information Transferred Internationally?</h2>
          <p>Our servers are located in secure, globally distributed data centers. If you are accessing our Services from outside these regions, please be aware that your information may be transferred to, stored, and processed by us in our facilities and by those third parties with whom we may share your personal information.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">5. How Long Do We Keep Your Information?</h2>
          <p>We will only keep your personal information for as long as it is necessary for the purposes set out in this privacy notice, unless a longer retention period is required or permitted by law (such as tax, accounting or other legal requirements). When we have no ongoing legitimate business need to process your personal information, we will either delete or anonymize such information.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">6. How Do We Keep Your Information Safe?</h2>
          <p>We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process (including end-to-end encryption, regular database backups, and secure OAuth flows). However, despite our safeguards and efforts to secure your information, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">7. Your Privacy Rights</h2>
          <p>Depending on your location, you may have the right to request access and obtain a copy of your personal information, to request rectification or erasure; to restrict the processing of your personal information; and, if applicable, to data portability. You can execute these rights through your Account Settings or by contacting our support team.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">8. Contact Us</h2>
          <p>If you have questions or comments about this notice, you may email our Data Protection Officer (DPO) at ashwinachu9525@gmail.com or by post to our registered office.</p>
        </div>
        
        <div className="mt-12 pt-8 border-t text-sm text-gray-500">
          Last Updated: June 13, 2026
        </div>
      </div>
    </div>
  )
}
