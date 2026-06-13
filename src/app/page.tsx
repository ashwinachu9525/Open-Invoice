import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { 
  ArrowRight, 
  Bot, 
  FileText, 
  Zap, 
  ShieldCheck, 
  CheckCircle2, 
  Calculator,
  Receipt,
  FileBox,
  GlobeLock
} from "lucide-react"

import { IS_PAID_MODE } from "@/lib/app-mode"

export default async function HomePage() {
  const session = await auth()
  
  // If the user is already logged in, send them straight to the dashboard
  if (session?.user) {
    redirect("/dashboard")
  }

  // If we are in free/self-host mode, skip the landing page entirely
  if (!IS_PAID_MODE) {
    redirect("/login")
  }

  const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Open Invoice"

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-xl z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Zap className="w-4 h-4 text-white" />
            </div>
            {APP_NAME}
          </div>
          
          <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-300">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#free-tools" className="hover:text-white transition-colors">Free Tools</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Policies</Link>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden sm:block text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link 
              href="/register" 
              className="text-sm font-semibold bg-white text-slate-950 px-5 py-2.5 rounded-full hover:bg-slate-200 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-white/10"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-sm font-medium text-indigo-300 mb-8 backdrop-blur-md">
            <ShieldCheck className="w-4 h-4" />
            Built exclusively for Freelancers & Small Teams
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
            Professional Billing. <br className="hidden lg:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              Zero Enterprise Bloat.
            </span>
          </h1>
          
          <p className="text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Create precise GST invoices instantly using AI. Stop wrestling with clunky B2B ERPs. 
            Enjoy free access to beautiful, self-hosted, and deeply secure invoicing tools.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/register" 
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:shadow-xl hover:shadow-indigo-500/25 transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              Create Free Account
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link 
              href="#free-tools" 
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white px-8 py-4 rounded-full font-semibold hover:bg-white/10 transition-all"
            >
              Try Free Tools
            </Link>
          </div>

          <div className="mt-12 pt-8 flex flex-wrap justify-center gap-8 text-sm text-slate-500 font-medium">
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Free Tier Available</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> No B2B Overcomplication</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Perfect for Freelancers</div>
          </div>
        </div>
      </section>

      {/* Free Public Tools Section */}
      <section id="free-tools" className="py-24 relative overflow-hidden bg-slate-900/30 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Free Public Document Generators</h2>
            <p className="text-slate-400 text-lg">
              Don't want to sign up yet? Use our free public tools to generate PDF documents instantly right from your browser.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Link href="/free-invoice-software" className="group bg-slate-950 p-8 rounded-3xl border border-white/5 hover:border-indigo-500/30 hover:bg-slate-900 transition-all block">
              <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Receipt className="w-7 h-7 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 flex items-center justify-between">
                Free Invoice Maker <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
              </h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                Generate highly professional, GST-ready PDF invoices without creating an account.
              </p>
            </Link>

            <Link href="/free-quotation-software" className="group bg-slate-950 p-8 rounded-3xl border border-white/5 hover:border-pink-500/30 hover:bg-slate-900 transition-all block">
              <div className="w-14 h-14 bg-pink-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <FileBox className="w-7 h-7 text-pink-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 flex items-center justify-between">
                Free Quotation Maker <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-pink-400 transition-colors" />
              </h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                Draft beautiful quotations to win your next big freelance project instantly.
              </p>
            </Link>

            <Link href="/free-estimate-software" className="group bg-slate-950 p-8 rounded-3xl border border-white/5 hover:border-emerald-500/30 hover:bg-slate-900 transition-all block">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Calculator className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 flex items-center justify-between">
                Free Estimate Maker <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                Quickly calculate costs and provide clear estimates to your prospective clients.
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Built for Solo-preneurs & Small Teams</h2>
            <p className="text-slate-400 text-lg">Everything you need to manage your business, without the bloated B2B menus.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900/50 p-8 rounded-2xl border border-white/5 flex gap-6 items-start">
              <div className="w-12 h-12 shrink-0 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Bot className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">AI-Powered Drafting</h3>
                <p className="text-slate-400 leading-relaxed text-sm">
                  Let AI write complex line-item descriptions. Perfect for freelance consultants, developers, and designers.
                </p>
              </div>
            </div>

            <div className="bg-slate-900/50 p-8 rounded-2xl border border-white/5 flex gap-6 items-start">
              <div className="w-12 h-12 shrink-0 bg-purple-500/10 rounded-xl flex items-center justify-center">
                <GlobeLock className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2 leading-snug">Your Data, Our Priority: Privacy and Security Guaranteed</h3>
                <p className="text-slate-400 leading-relaxed text-sm">
                  Your financial data is protected by WebAuthn Passkeys and strict tenant isolation. Your data stays yours.
                </p>
              </div>
            </div>

            <div className="bg-slate-900/50 p-8 rounded-2xl border border-white/5 flex gap-6 items-start">
              <div className="w-12 h-12 shrink-0 bg-orange-500/10 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Instant PDF Exports</h3>
                <p className="text-slate-400 leading-relaxed text-sm">
                  Generate pixel-perfect, highly customized PDFs directly from your browser.
                </p>
              </div>
            </div>

            <div className="bg-slate-900/50 p-8 rounded-2xl border border-white/5 flex gap-6 items-start">
              <div className="w-12 h-12 shrink-0 bg-teal-500/10 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-teal-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">GDPR & GST Compliant</h3>
                <p className="text-slate-400 leading-relaxed text-sm">
                  We handle the strict compliance rules so you can focus on running your actual business.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden bg-slate-900/50 border-t border-white/5">
        <div className="absolute inset-0 bg-indigo-500/5 backdrop-blur-3xl" />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl lg:text-5xl font-extrabold mb-6">Start Managing Your Business Better</h2>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            Join the freelancers and small teams using Open Invoice to send secure, beautiful documents.
          </p>
          <Link 
            href="/register" 
            className="inline-flex items-center justify-center gap-3 bg-white text-slate-950 px-10 py-5 rounded-full font-bold text-lg hover:bg-slate-200 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/10"
          >
            Create Your Free Account
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Massive Footer with all Policies */}
      <footer className="border-t border-white/10 pt-16 pb-8 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
            <div>
              <h4 className="font-bold text-white mb-6">Product</h4>
              <ul className="space-y-4 text-sm text-slate-400">
                <li><Link href="/free-invoice-software" className="hover:text-white transition-colors">Free Invoice Generator</Link></li>
                <li><Link href="/free-quotation-software" className="hover:text-white transition-colors">Free Quotation Maker</Link></li>
                <li><Link href="/free-estimate-software" className="hover:text-white transition-colors">Free Estimate Creator</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Client Dashboard</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-white mb-6">Legal</h4>
              <ul className="space-y-4 text-sm text-slate-400">
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/cookie" className="hover:text-white transition-colors">Cookie Policy</Link></li>
                <li><Link href="/trademark" className="hover:text-white transition-colors">Trademark Policy</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-6">Compliance</h4>
              <ul className="space-y-4 text-sm text-slate-400">
                <li><Link href="/gdpr" className="hover:text-white transition-colors">GDPR Compliance</Link></li>
                <li><Link href="/security-compliance" className="hover:text-white transition-colors">Security Compliance</Link></li>
                <li><Link href="/anti-spam" className="hover:text-white transition-colors">Anti-spam Policy</Link></li>
                <li><Link href="/abuse" className="hover:text-white transition-colors">Abuse Policy</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-6">Support</h4>
              <ul className="space-y-4 text-sm text-slate-400">
                <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link href="/ipr" className="hover:text-white transition-colors">IPR Complaints</Link></li>
                <li><a href="https://github.com/ashwinachu9525/Open-Invoice.git" className="hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">GitHub Repository</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-500 text-sm">
            <div className="flex items-center gap-2 font-bold text-slate-300">
              <Zap className="w-4 h-4" /> {APP_NAME}
            </div>
            <p>&copy; {new Date().getFullYear()} {APP_NAME}. Built for freelancers, not massive enterprises.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
