import { ReactNode } from "react"
import Link from "next/link"
import { FileText, Home, Users, Settings, Menu, BarChart3, Sparkles, Zap, Package, Mail, Receipt, HelpCircle } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import { SignOutButton } from "@/components/dashboard/sign-out-button"
import { ThemeToggle } from "@/components/dashboard/theme-toggle"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { PasskeyPromptModal } from "@/components/auth/passkey-prompt-modal"
import { OfflineIndicator } from "@/components/layout/offline-indicator"
import { RandomFeedbackModal } from "@/components/layout/random-feedback-modal"
import { DesktopNavLinks, MobileNavLinks } from "@/components/layout/sidebar-nav"
import { ProductTour } from "@/components/dashboard/product-tour"



export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role === "SUPER_ADMIN") redirect("/admin")

  const initials = session.user.name
    ? session.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : (session.user.email?.[0] ?? "U").toUpperCase()

  const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Open Invoice"

  return (
    <div className="flex min-h-screen w-full">
      {/* ── Desktop Sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col sm:flex glass-sidebar bg-sidebar/80 backdrop-blur-2xl">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-white/8 px-6">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/30 group-hover:shadow-violet-500/50 transition-all duration-300">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-base gradient-text">{APP_NAME}</span>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Indian GST Suite</p>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-auto py-4 px-3 space-y-1">
          <DesktopNavLinks />
        </nav>

        {/* Footer */}
        <div className="border-t border-white/8 p-4 space-y-3">
          <div className="flex items-center gap-3 px-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xs font-bold shadow-md">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{session.user.name ?? session.user.email}</p>
              {session.user.name && (
                <p className="text-[10px] text-muted-foreground truncate">{session.user.email}</p>
              )}
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex flex-col sm:pl-64 w-full min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-white/8 backdrop-blur-xl bg-background/60 px-4 sm:px-6">
          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger className="sm:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 hover:bg-white/8 transition-colors">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 glass border-white/10 p-0 flex flex-col">
              <div className="flex h-16 items-center border-b border-white/8 px-6 shrink-0">
                <Link href="/dashboard" className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-bold gradient-text">{APP_NAME}</span>
                </Link>
              </div>
              <nav className="flex-1 overflow-auto grid gap-1 p-3 mt-2">
                <MobileNavLinks />
              </nav>
              <div className="border-t border-white/8 p-4 shrink-0">
                <SignOutButton />
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex w-full items-center justify-end gap-3">
            <OfflineIndicator />
            <ThemeToggle />
            <div className="h-8 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xs font-bold">
                {initials}
              </div>
              <span className="hidden sm:block text-sm font-medium">{session.user.name ?? session.user.email}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>
      
      {session.user.id && session.user.passkeyPrompted === false && (
        <PasskeyPromptModal userId={session.user.id} />
      )}
      <RandomFeedbackModal />
      <ProductTour hasSeenTour={(session.user as any).hasSeenTour ?? false} />
    </div>
  )
}
