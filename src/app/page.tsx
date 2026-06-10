import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowRight, Bot, FileText, Zap, ShieldCheck, Mail, Database, CheckCircle2 } from "lucide-react"

export default async function HomePage() {
  const session = await auth()
  
  // If the user is already logged in, send them straight to the dashboard
  if (session?.user) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-indigo-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            InvoiceAI
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Login
            </Link>
            <Link 
              href="/register" 
              className="text-sm font-medium bg-white text-slate-950 px-4 py-2 rounded-full hover:bg-slate-200 transition-colors"
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-indigo-300 mb-8">
            <span className="flex w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Multi-LLM Orchestration Enabled
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
            Invoicing Made <br className="hidden lg:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              Effortless with AI
            </span>
          </h1>
          
          <p className="text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Create GST-compliant invoices in seconds using our intelligent chatbot. 
            No more tedious forms. Just chat, confirm, and send.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/register" 
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-4 rounded-full font-semibold hover:shadow-lg hover:shadow-indigo-500/25 transition-all hover:-translate-y-0.5"
            >
              Start Generating Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link 
              href="/login" 
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white px-8 py-4 rounded-full font-semibold hover:bg-white/10 transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-slate-900/50 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Everything you need to bill clients</h2>
            <p className="text-slate-400 text-lg">Powerful features wrapped in an incredibly simple conversational interface.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-slate-950 p-8 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-colors group">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-indigo-500/20 transition-colors">
                <Bot className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">AI Chat Orchestration</h3>
              <p className="text-slate-400 leading-relaxed">
                Just chat to generate invoices. Our system intelligently routes to the best AI models (Gemini, OpenAI, NIM) for fast, accurate parsing.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-950 p-8 rounded-2xl border border-white/5 hover:border-purple-500/30 transition-colors group">
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-purple-500/20 transition-colors">
                <ShieldCheck className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Smart GST Compliance</h3>
              <p className="text-slate-400 leading-relaxed">
                Built-in support for Indian GST (0%, 5%, 12%, 18%, 28%), HSN/SAC codes, and automatic tax calculations without the math.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-950 p-8 rounded-2xl border border-white/5 hover:border-pink-500/30 transition-colors group">
              <div className="w-12 h-12 bg-pink-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-pink-500/20 transition-colors">
                <FileText className="w-6 h-6 text-pink-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Instant PDF Generation</h3>
              <p className="text-slate-400 leading-relaxed">
                Generate beautiful, professional PDF invoices instantly. Download them directly from the chat or the invoice dashboard.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-slate-950 p-8 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-colors group">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition-colors">
                <Database className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Master Data Management</h3>
              <p className="text-slate-400 leading-relaxed">
                Securely store Client details and Company Bank Accounts. The AI automatically pulls the right information for your invoices.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-slate-950 p-8 rounded-2xl border border-white/5 hover:border-emerald-500/30 transition-colors group">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-emerald-500/20 transition-colors">
                <Zap className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Automated Workflows</h3>
              <p className="text-slate-400 leading-relaxed">
                Schedule recurring invoices (daily, weekly, monthly) and let the system automatically generate and record them in the background.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-slate-950 p-8 rounded-2xl border border-white/5 hover:border-orange-500/30 transition-colors group">
              <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-orange-500/20 transition-colors">
                <Mail className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Email Integration</h3>
              <p className="text-slate-400 leading-relaxed">
                Send invoices directly to your clients' inboxes with one click. Track sent status and manage your accounts receivable effortlessly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-indigo-500/5" />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">Ready to upgrade your invoicing?</h2>
          <p className="text-xl text-slate-400 mb-10">
            Join the beta today and experience the future of AI-powered accounting.
          </p>
          <Link 
            href="/register" 
            className="inline-flex items-center justify-center gap-2 bg-white text-slate-950 px-8 py-4 rounded-full font-bold text-lg hover:bg-slate-200 transition-all hover:scale-105"
          >
            Create Your Free Account
            <ArrowRight className="w-5 h-5" />
          </Link>
          
          <div className="mt-10 flex items-center justify-center gap-6 text-sm text-slate-500">
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> No credit card required</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Cancel anytime</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 text-center text-slate-500 text-sm">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-slate-300">
            <Zap className="w-4 h-4" /> InvoiceAI
          </div>
          <p>&copy; {new Date().getFullYear()} InvoiceAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
