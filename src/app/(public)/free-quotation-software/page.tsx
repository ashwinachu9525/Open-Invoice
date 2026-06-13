import { Metadata } from "next"
import Link from "next/link"
import { CheckCircle2, ShieldCheck, ArrowRight, Zap, FileText, CheckCircle, CreditCard, LayoutTemplate } from "lucide-react"

export const metadata: Metadata = {
  title: "Free Quotation Software for Small Businesses | InvoiceAI",
  description: "Create professional quotations, send estimates, and track payments with our 100% free online quotation software designed for small businesses and freelancers.",
}

export default function FreeQuotationSoftwarePage() {
  return (
    <div className="bg-white text-slate-900 font-sans selection:bg-blue-500/30">
      {/* Hero Section */}
      <section className="relative pt-24 pb-20 lg:pt-32 lg:pb-28 overflow-hidden bg-slate-50 border-b border-slate-200">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/50 via-slate-50 to-white" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-sm font-semibold text-blue-700 mb-8">
            <ShieldCheck className="w-4 h-4" />
            100% Free Forever • No Credit Card Required
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1] text-slate-900">
            Free Online Quotation Software <br className="hidden lg:block" />
            <span className="text-blue-600">
              for Small Businesses.
            </span>
          </h1>
          
          <p className="text-lg lg:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Create professional quotations, send estimates, and get paid faster. 
            Designed to help freelancers and small businesses save time and look professional.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/register" 
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 hover:-translate-y-0.5"
            >
              Sign Up For Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link 
              href="/quotation-generator" 
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white border-2 border-slate-200 text-slate-700 px-8 py-4 rounded-xl font-semibold hover:border-slate-300 hover:bg-slate-50 transition-all"
            >
              Try Free Generator
            </Link>
          </div>

          <div className="mt-12 pt-8 flex flex-wrap justify-center gap-8 text-sm text-slate-600 font-medium">
            <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-500" /> Secure Cloud Storage</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-500" /> Unlimited Quotations</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-500" /> GST Compliant</div>
          </div>
        </div>
      </section>



      {/* Features Grid */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6">Everything you need to manage billing</h2>
            <p className="text-lg text-slate-600">
              Stop using spreadsheets and word processors. Switch to a streamlined invoicing experience that automates the boring parts.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">Professional Quotations</h3>
              <p className="text-slate-600">
                Create beautiful, customizable PDF quotations in seconds. Upload your logo and set your brand colors to stand out.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">AI-Powered Entry</h3>
              <p className="text-slate-600">
                Let our AI assist you in generating line item descriptions, organizing expenses, and filling out boring details.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <LayoutTemplate className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">Estimates & Quotes</h3>
              <p className="text-slate-600">
                Win more projects by sending professional estimates. Convert approved estimates directly into invoices with one click.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-6">
                <CreditCard className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">Tax & GST Ready</h3>
              <p className="text-slate-600">
                Fully compliant with regional tax rules. Automatically calculate CGST, SGST, IGST, and apply item-level discounts.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center mb-6">
                <CheckCircle className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">Track Payments</h3>
              <p className="text-slate-600">
                Never lose track of who owes you money. Mark invoices as paid, partial, or overdue, and manage your client database.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">Top-tier Security</h3>
              <p className="text-slate-600">
                Your data is protected with enterprise-grade encryption. Login seamlessly without passwords using WebAuthn Passkeys.
              </p>
            </div>
          </div>
        </div>
      </section>

      
      {/* FAQ Section */}
      <section className="py-24 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">Have more questions?</h2>
            <p className="text-xl text-slate-600">We've got answers.</p>
          </div>
          
          <div className="space-y-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Is it really 100% free?</h3>
              <p className="text-slate-600">Yes! Our core generation tools are completely free to use. You don't even need to link a credit card.</p>
            </div>
            
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Do I need an account to use the generator?</h3>
              <p className="text-slate-600">No, you can generate and download PDFs instantly without an account. However, creating a free account lets you save your data and track payments.</p>
            </div>
            
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Is my data secure?</h3>
              <p className="text-slate-600">Absolutely. We use enterprise-grade encryption and comply with GDPR standards to ensure your business data remains private.</p>
            </div>
            
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Can I customize the templates?</h3>
              <p className="text-slate-600">Yes, you can upload your company logo, change colors, and add custom notes or terms to every document you create.</p>
            </div>
          </div>
        </div>
      </section>
      {/* Security Section */}
      <section className="py-20 bg-slate-50 border-t border-slate-100">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-2">Your Data, Our Priority:</h2>
          <p className="text-2xl text-slate-700 font-semibold mb-4">Privacy and Security Guaranteed</p>
          <p className="text-lg text-slate-600 mb-12">
            Your information is safe and protected.
          </p>
          
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10 grayscale hover:grayscale-0 transition-all duration-500">
            {/* ISO 9001 */}
            <div className="flex items-center gap-4 bg-white border-2 border-slate-900 rounded-full px-6 py-3 shadow-sm">
              <div className="font-black text-2xl tracking-tighter text-slate-900">bsi.</div>
              <div className="w-0.5 h-10 bg-slate-900"></div>
              <div className="text-left leading-tight">
                <div className="font-bold text-sm text-slate-900">ISO</div>
                <div className="font-bold text-sm text-slate-900">9001:2015</div>
                <div className="text-[10px] text-slate-600 leading-none mt-1">Quality<br/>Management</div>
              </div>
            </div>

            {/* AICPA SOC */}
            <div className="flex flex-col justify-center items-center bg-slate-800 text-white rounded-full w-32 h-32 border-[6px] border-slate-200 shadow-sm relative">
              <div className="font-semibold tracking-widest text-sm text-slate-300">AICPA</div>
              <div className="font-bold text-3xl border-t border-b border-slate-500 py-1 my-1 w-20 text-center">SOC</div>
            </div>

            {/* GDPR */}
            <div className="flex flex-col justify-center items-center bg-slate-800 text-white rounded-full w-32 h-32 border-4 border-slate-200 shadow-sm relative">
              <div className="absolute inset-1.5 border-[3px] border-dotted border-white/50 rounded-full"></div>
              <div className="font-bold text-2xl z-10 tracking-widest">
                GDPR
              </div>
            </div>

            {/* ISO 27017 & 27018 */}
            <div className="flex items-center bg-white border-2 border-slate-900 rounded-full shadow-sm">
              <div className="px-6 py-3 border-r-2 border-slate-900 flex items-center h-full">
                 <div className="font-black text-2xl tracking-tighter text-slate-900">bsi.</div>
              </div>
              <div className="px-5 py-3 border-r-2 border-slate-900 text-left leading-tight h-full flex flex-col justify-center">
                <div className="font-bold text-sm text-slate-900">ISO/IEC<br/>27017</div>
                <div className="text-[10px] text-slate-600 leading-none mt-1">Security Controls<br/>for Cloud Services</div>
              </div>
              <div className="px-5 py-3 text-left leading-tight h-full flex flex-col justify-center">
                <div className="font-bold text-sm text-slate-900">ISO/IEC<br/>27018</div>
                <div className="text-[10px] text-slate-600 leading-none mt-1">Protection of<br/>Personally identifiable</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-blue-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-blue-500 via-blue-600 to-blue-700" />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl font-extrabold text-white mb-6">Ready to upgrade your quoting process?</h2>
          <p className="text-xl text-blue-100 mb-10">
            Join thousands of small businesses that trust us to manage their quotes. It takes less than a minute to get started.
          </p>
          <Link 
            href="/register" 
            className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 transition-all shadow-xl shadow-blue-900/20 hover:-translate-y-1"
          >
            Create Your Free Account
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  )
}
