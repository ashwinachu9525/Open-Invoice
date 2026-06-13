import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "Learn how we use cookies and similar technologies to improve your experience.",
}

export default function CookiePolicyPage() {
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
        
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-8">Cookie Policy</h1>
        
        <div className="prose prose-blue max-w-none text-gray-700 space-y-6">
          <p className="lead text-lg text-gray-500">
            This Cookie Policy explains how Invoice AI uses cookies and similar technologies to recognize you when you visit our website and use our application.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">1. What are cookies?</h2>
          <p>Cookies are small data files that are placed on your computer or mobile device when you visit a website. Cookies are widely used by website owners in order to make their websites work, or to work more efficiently, as well as to provide reporting information.</p>
          <p>Cookies set by the website owner (in this case, Invoice AI) are called "first party cookies". Cookies set by parties other than the website owner are called "third party cookies". Third party cookies enable third party features or functionality to be provided on or through the website (e.g. like advertising, interactive content and analytics).</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">2. Why do we use cookies?</h2>
          <p>We use first and third party cookies for several reasons. Some cookies are required for technical reasons in order for our Websites to operate, and we refer to these as "essential" or "strictly necessary" cookies. Other cookies also enable us to track and target the interests of our users to enhance the experience on our Online Properties.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">3. Types of cookies we use</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Essential Cookies:</strong> These cookies are strictly necessary to provide you with services available through our Websites and to use some of its features, such as access to secure areas (e.g., maintaining your logged-in session securely using JWTs).</li>
            <li><strong>Performance and Functionality Cookies:</strong> These cookies are used to enhance the performance and functionality of our Websites but are non-essential to their use. However, without these cookies, certain functionality (like videos) may become unavailable.</li>
            <li><strong>Analytics and Customization Cookies:</strong> These cookies collect information that is used either in aggregate form to help us understand how our Websites are being used or how effective our marketing campaigns are, or to help us customize our Websites for you.</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">4. How can I control cookies?</h2>
          <p>You have the right to decide whether to accept or reject cookies. You can exercise your cookie rights by setting your preferences in the Cookie Consent Manager. The Cookie Consent Manager allows you to select which categories of cookies you accept or reject. Essential cookies cannot be rejected as they are strictly necessary to provide you with services.</p>
          <p>You can also set or amend your web browser controls to accept or refuse cookies. If you choose to reject cookies, you may still use our website though your access to some functionality and areas of our website may be restricted.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">5. Changes to this Cookie Policy</h2>
          <p>We may update this Cookie Policy from time to time in order to reflect, for example, changes to the cookies we use or for other operational, legal or regulatory reasons. Please therefore re-visit this Cookie Policy regularly to stay informed about our use of cookies and related technologies.</p>
          
          <h2 className="text-xl font-semibold text-gray-900 mt-8">6. Contact Us</h2>
          <p>If you have any questions about our use of cookies or other technologies, please email us at ashwinachu9525@gmail.com.</p>
        </div>
        
        <div className="mt-12 pt-8 border-t text-sm text-gray-500">
          Last Updated: June 13, 2026
        </div>
      </div>
    </div>
  )
}
