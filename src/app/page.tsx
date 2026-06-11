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
  Lock, 
  Fingerprint, 
  ServerCrash,
  GlobeLock
} from "lucide-react"

export default async function HomePage() {
  const session = await auth()
  
  // If the user is already logged in, send them straight to the dashboard
  if (session?.user) {
    redirect("/dashboard")
  }

  const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "InvoiceAI"

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
          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden sm:block text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link 
              href="/register" 
              className="text-sm font-semibold bg-white text-slate-950 px-5 py-2.5 rounded-full hover:bg-slate-200 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-white/10"
            >
              Get Started
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
            ISO 27001 & SOC 2 Ready Architecture
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
            Enterprise B2B Billing. <br className="hidden lg:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              Secured & AI-Powered.
            </span>
          </h1>
          
          <p className="text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Create precise Indian GST invoices instantly using our multi-LLM orchestration. 
            Protected by strict tenant isolation, MFA, and Passwordless Passkeys.
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
              href="/login" 
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white px-8 py-4 rounded-full font-semibold hover:bg-white/10 transition-all"
            >
              Sign In to Dashboard
            </Link>
          </div>

          <div className="mt-12 pt-8 border-t border-white/5 flex flex-wrap justify-center gap-8 text-sm text-slate-500 font-medium">
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-400" /> Bank-Grade Encryption</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-400" /> WebAuthn Passkeys</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-400" /> 100% Data Isolation</div>
          </div>
        </div>
      </section>

      {/* The "Dealbreaker" Security Section */}
      <section className="py-24 relative overflow-hidden bg-slate-950 border-y border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-emerald-900/10 via-slate-950 to-slate-950" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Security Isn't an Add-On. It's the Foundation.</h2>
            <p className="text-slate-400 text-lg">
              Designed from the ground up for B2B SaaS compliance, ensuring your financial data never leaks.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-900/50 p-8 rounded-3xl border border-white/5 hover:border-emerald-500/30 transition-all">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6">
                <GlobeLock className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Strict Tenant Isolation</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                Every database query is aggressively scoped to your exact Company ID at the ORM level. Cross-tenant data leakage is mathematically impossible by design.
              </p>
            </div>

            <div className="bg-slate-900/50 p-8 rounded-3xl border border-white/5 hover:border-indigo-500/30 transition-all">
              <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6">
                <Fingerprint className="w-7 h-7 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Passwordless Passkeys</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                Say goodbye to weak passwords. Authenticate instantly and securely using your device's built-in biometrics (TouchID, FaceID, or Windows Hello).
              </p>
            </div>

            <div className="bg-slate-900/50 p-8 rounded-3xl border border-white/5 hover:border-purple-500/30 transition-all">
              <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6">
                <Lock className="w-7 h-7 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Mandatory MFA (TOTP)</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                Protect your billing dashboard with Time-Based One-Time Passwords. Seamlessly syncs with Google Authenticator, Authy, or Apple Passwords.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid (AI & Billing) */}
      <section className="py-24 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Intelligent Invoicing Features</h2>
            <p className="text-slate-400 text-lg">Everything you need to run your Indian business effortlessly.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
            {/* Feature 1 */}
            <div className="bg-slate-950 p-8 rounded-2xl border border-white/5 flex gap-6 items-start hover:border-white/10 transition-colors">
              <div className="w-12 h-12 shrink-0 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Bot className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Multi-LLM AI Assistants</h3>
                <p className="text-slate-400 leading-relaxed text-sm">
                  Connect your own OpenAI, Google Gemini, or Nvidia NIM API keys. Our AI auto-completes complex line item descriptions and intelligently structures your billing data.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-950 p-8 rounded-2xl border border-white/5 flex gap-6 items-start hover:border-white/10 transition-colors">
              <div className="w-12 h-12 shrink-0 bg-pink-500/10 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-pink-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Instant PDF & Quotations</h3>
                <p className="text-slate-400 leading-relaxed text-sm">
                  Draft professional estimates and instantly convert them to invoices upon approval. Download pixel-perfect PDFs or email them directly from the app.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-950 p-8 rounded-2xl border border-white/5 flex gap-6 items-start hover:border-white/10 transition-colors">
              <div className="w-12 h-12 shrink-0 bg-orange-500/10 rounded-xl flex items-center justify-center">
                <ServerCrash className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Indian GST Compliance</h3>
                <p className="text-slate-400 leading-relaxed text-sm">
                  Built specifically for the Indian market. Automatically calculates CGST, SGST, or IGST based on the customer's state. Full support for HSN/SAC codes.
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="bg-slate-950 p-8 rounded-2xl border border-white/5 flex gap-6 items-start hover:border-white/10 transition-colors">
              <div className="w-12 h-12 shrink-0 bg-teal-500/10 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-teal-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Automated Expenses</h3>
                <p className="text-slate-400 leading-relaxed text-sm">
                  Track your business expenses and generate beautiful Profit & Loss reports instantly. Keep a firm grasp on your net margins without complex spreadsheets.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-indigo-500/10 backdrop-blur-3xl" />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl lg:text-5xl font-extrabold mb-6">Upgrade Your Business Today</h2>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            Stop wrestling with unsecure spreadsheets and clunky ERPs. Join the next generation of secure, AI-powered accounting.
          </p>
          <Link 
            href="/register" 
            className="inline-flex items-center justify-center gap-3 bg-white text-slate-950 px-10 py-5 rounded-full font-bold text-lg hover:bg-slate-200 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/10"
          >
            Create Your Account Now
            <ArrowRight className="w-5 h-5" />
          </Link>
          
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-sm text-slate-400">
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Free to start</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> No credit card required</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Setup in 2 minutes</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 text-center text-slate-500 text-sm bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-slate-300">
            <Zap className="w-4 h-4" /> {APP_NAME}
          </div>
          <div className="flex items-center gap-6">
            <Link href="/help" className="hover:text-white transition-colors">Help Center</Link>
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
          </div>
          <p>&copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
