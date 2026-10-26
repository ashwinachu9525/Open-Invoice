import { ReactNode } from "react"
import Link from "next/link"
import { Target, Menu, Receipt, Sparkles, ArrowRight } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { SignOutButton } from "@/components/dashboard/sign-out-button"
import { ThemeToggle } from "@/components/dashboard/theme-toggle"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { OfflineIndicator } from "@/components/layout/offline-indicator"
import { AppSwitcher } from "@/components/layout/app-switcher"
import { CrmQuickCreate } from "@/components/crm/crm-quick-create"
import { CrmDesktopNavLinks, CrmMobileNavLinks } from "@/components/crm/crm-sidebar-nav"

export default async function CrmLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role === "SUPER_ADMIN") redirect("/admin")

  const initials = session.user.name
    ? session.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : (session.user.email?.[0] ?? "U").toUpperCase()

  const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Open Invoice"

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* ── Desktop Sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col sm:flex glass-sidebar bg-sidebar/80 backdrop-blur-2xl border-r border-white/8">
        {/* Workspace Brand & App Switcher */}
        <div className="p-4 border-b border-white/8 space-y-3">
          <div className="flex items-center gap-2.5 px-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20 text-white">
              <Target className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-foreground">{APP_NAME}</span>
              <p className="text-[10px] text-emerald-400 font-medium">Sales CRM Platform</p>
            </div>
          </div>
          <AppSwitcher />
        </div>

        {/* CRM Navigation Links */}
        <nav className="flex-1 overflow-auto py-3 px-3">
          <CrmDesktopNavLinks />
        </nav>

        {/* User Footer */}
        <div className="border-t border-white/8 p-4 space-y-3">
          <div className="flex items-center gap-3 px-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-bold shadow-md">
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

      {/* ── Main Content Area ── */}
      <div className="flex flex-col sm:pl-64 w-full min-h-screen">
        {/* CRM Sticky Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-white/8 backdrop-blur-xl bg-background/70 px-4 sm:px-6">
          {/* Mobile menu trigger */}
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger className="sm:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 hover:bg-white/8 transition-colors">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle CRM Menu</span>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 glass border-white/10 p-0 flex flex-col">
                <div className="p-4 border-b border-white/8 space-y-3">
                  <div className="flex items-center gap-2.5 px-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                      <Target className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-foreground">{APP_NAME}</span>
                      <p className="text-[10px] text-emerald-400 font-medium">Sales CRM Platform</p>
                    </div>
                  </div>
                  <AppSwitcher />
                </div>
                <nav className="flex-1 overflow-auto p-3">
                  <CrmMobileNavLinks />
                </nav>
                <div className="border-t border-white/8 p-4 shrink-0">
                  <SignOutButton />
                </div>
              </SheetContent>
            </Sheet>

            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                CRM Suite
              </span>
              <span>•</span>
              <span className="text-foreground font-medium">Sales Automation & Pipelines</span>
            </div>
          </div>

          {/* Right actions: Context-aware New button, Quick switch to invoicing, theme toggle, avatar */}
          <div className="flex items-center gap-3">
            {/* Quick Invoicing Jump Link */}
            <Link
              href="/dashboard"
              className="hidden md:flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 border border-white/8 transition-colors"
            >
              <Receipt className="h-3.5 w-3.5 text-violet-400" />
              <span>Invoicing Suite</span>
              <ArrowRight className="h-3 w-3 opacity-60" />
            </Link>

            {/* Context-Aware CRM New Button */}
            <CrmQuickCreate />

            <div className="hidden sm:block h-6 w-px bg-white/10 mx-0.5" />
            <OfflineIndicator />
            <ThemeToggle />
            <div className="h-8 w-px bg-white/10" />

            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-bold shadow-sm">
                {initials}
              </div>
              <span className="hidden sm:block text-xs font-medium">{session.user.name ?? session.user.email}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
