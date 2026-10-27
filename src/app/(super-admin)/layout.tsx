import { ReactNode } from "react"
import Link from "next/link"
import { Menu, Zap, LayoutGrid } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { SignOutButton } from "@/components/dashboard/sign-out-button"
import { ThemeToggle } from "@/components/dashboard/theme-toggle"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AdminDesktopNav, AdminMobileNav } from "@/components/admin/admin-sidebar-nav"

export default async function SuperAdminLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "SUPER_ADMIN") redirect("/dashboard")

  const pendingProCount = await prisma.company.count({
    where: { proRequestStatus: "PENDING" },
  }).catch(() => 0)

  const initials = session.user.name
    ? session.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : (session.user.email?.[0] ?? "U").toUpperCase()

  return (
    <div className="flex min-h-screen w-full">
      {/* ── Desktop Sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col sm:flex glass-sidebar bg-sidebar/80 backdrop-blur-2xl">
        <div className="flex h-16 items-center border-b border-white/8 px-6">
          <Link href="/admin" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30 group-hover:shadow-amber-500/50 transition-all duration-300">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-base gradient-text">Central Admin</span>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Global Portal</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto py-5 px-3">
          <AdminDesktopNav pendingProCount={pendingProCount} />
        </nav>

        <div className="border-t border-white/8 p-4 space-y-3">
          <div className="flex items-center gap-3 px-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white text-xs font-bold shadow-md">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate text-amber-500">{session.user.name ?? session.user.email}</p>
              <p className="text-[10px] text-muted-foreground truncate">Super Admin</p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex flex-col sm:pl-64 w-full min-h-screen">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-white/8 backdrop-blur-xl bg-background/60 px-4 sm:px-6">
          <Sheet>
            <SheetTrigger className="sm:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 hover:bg-white/8 transition-colors">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 glass border-white/10 p-0 flex flex-col">
              <div className="flex h-16 items-center border-b border-white/8 px-6 shrink-0">
                <Link href="/admin" className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-bold gradient-text">Central Admin</span>
                </Link>
              </div>
              <nav className="flex-1 overflow-y-auto">
                <AdminMobileNav pendingProCount={pendingProCount} />
              </nav>
              <div className="border-t border-white/8 p-4 shrink-0">
                <SignOutButton />
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex w-full items-center justify-between gap-3">
            <div className="hidden md:flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Live Control Center
              </span>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <Link
                href="/dashboard"
                className="hidden sm:inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-all"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
                Tenant Dashboard
              </Link>
              <ThemeToggle />
              <div className="h-8 w-px bg-white/10" />
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white text-xs font-bold">
                  {initials}
                </div>
                <span className="hidden sm:block text-sm font-medium text-amber-500">Super Admin</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
