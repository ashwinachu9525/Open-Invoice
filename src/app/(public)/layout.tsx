import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Free Invoice Generator | OpenInvoice",
  description: "Create professional invoices and quotations instantly. No signup required.",
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/30">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="font-bold text-xl gradient-text flex items-center gap-2">
            <span className="bg-primary/20 p-1.5 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-primary"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </span>
            InvoiceAI
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm font-medium">
            <a href="/invoice-generator" className="text-muted-foreground hover:text-foreground transition-colors">Invoice</a>
            <a href="/quotation-generator" className="text-muted-foreground hover:text-foreground transition-colors">Quotation</a>
            <a href="/estimate-generator" className="text-muted-foreground hover:text-foreground transition-colors">Estimate</a>
            <a href="/hsn-sac" className="text-muted-foreground hover:text-foreground transition-colors">HSN/SAC</a>
            <a href="/gst-calculator" className="text-muted-foreground hover:text-foreground transition-colors">GST Calc</a>
          </nav>
          <div className="flex items-center gap-4">
            <a href="/login" className="text-sm font-medium hover:underline text-muted-foreground hover:text-foreground">Login</a>
            <a href="/register" className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors">Sign up free</a>
          </div>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
      <footer className="border-t border-white/10 py-8 bg-muted/20">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground space-y-2">
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-1">
            <a href="/invoice-generator" className="hover:text-foreground transition-colors">Free Invoice Generator</a>
            <a href="/gst-calculator" className="hover:text-foreground transition-colors">GST Calculator</a>
            <a href="/hsn-sac" className="hover:text-foreground transition-colors">HSN/SAC Codes</a>
            <a href="/quotation-generator" className="hover:text-foreground transition-colors">Quotation Generator</a>
          </div>
          <p>© {new Date().getFullYear()} Open-Invoice. Free tools for freelancers and small businesses.</p>
        </div>
      </footer>
    </div>
  )
}
