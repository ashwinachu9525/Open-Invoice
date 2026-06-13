const fs = require('fs');
const path = require('path');

const pages = [
  { path: 'privacy', title: 'Privacy Policy' },
  { path: 'cookie', title: 'Cookie Policy' },
  { path: 'trademark', title: 'Trademark Policy' },
  { path: 'gdpr', title: 'GDPR Compliance' },
  { path: 'security-compliance', title: 'Security Compliance' },
  { path: 'anti-spam', title: 'Anti-spam Policy' },
  { path: 'abuse', title: 'Abuse Policy' },
  { path: 'help', title: 'Help Center' },
  { path: 'ipr', title: 'IPR Complaints' }
];

const template = (title) => `import Link from "next/link"
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
        
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-8">${title}</h1>
        
        <div className="prose prose-blue max-w-none text-gray-600 space-y-6">
          <p>
            This is the official ${title} for Open Invoice. We are currently updating our detailed legal documentation. 
            Please check back soon for the full text of our ${title}.
          </p>
          <p>
            If you have any immediate concerns regarding our ${title}, please contact our legal or support team through the Contact Us page.
          </p>
        </div>
        
        <div className="mt-12 pt-8 border-t text-sm text-gray-500">
          Last Updated: {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  )
}
`;

pages.forEach(p => {
  const dir = path.join(__dirname, '../src/app', p.path);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'page.tsx'), template(p.title));
});

// Create Contact Us separately
const contactDir = path.join(__dirname, '../src/app/contact');
fs.mkdirSync(contactDir, { recursive: true });
fs.writeFileSync(path.join(contactDir, 'page.tsx'), `import Link from "next/link"
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
          href="mailto:support@openinvoice.local?subject=Support Request from Open Invoice" 
          className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm w-full sm:w-auto"
        >
          <Mail className="w-5 h-5" />
          Click to Send Email
        </a>
      </div>
    </div>
  )
}
`);
console.log("Pages generated");
