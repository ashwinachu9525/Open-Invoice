import { ReactNode } from "react"
import Link from "next/link"
import { Home, Users, Settings, Menu, Zap, Wrench } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import { SignOutButton } from "@/components/dashboard/sign-out-button"
import { ThemeToggle } from "@/components/dashboard/theme-toggle"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

const superAdminNavItems = [
  { href: "/admin", label: "Dashboard", icon: Home },
  { href: "/admin/users", label: "Manage Users", icon: Users },
  { href: "/admin/tools", label: "Admin Tools", icon: Wrench },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

export default async function SuperAdminLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "SUPER_ADMIN") redirect("/dashboard")

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

        <nav className="flex-1 overflow-auto py-4 px-3 space-y-1">
          {superAdminNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-white/8 hover:text-foreground hover:translate-x-0.5"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 group-hover:bg-amber-500/20 group-hover:text-amber-500 transition-all duration-200">
                <item.icon className="h-4 w-4" />
              </span>
              {item.label}
            </Link>
          ))}
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
              <nav className="flex-1 overflow-auto grid gap-1 p-3 mt-2">
                {superAdminNavItems.map((item) => (
                  <SheetClose
                    key={item.href}
                    render={
                      <Link
                        href={item.href}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-white/8 hover:text-foreground transition-all"
                      />
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </SheetClose>
                ))}
              </nav>
              <div className="border-t border-white/8 p-4 shrink-0">
                <SignOutButton />
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex w-full items-center justify-end gap-3">
            <ThemeToggle />
            <div className="h-8 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white text-xs font-bold">
                {initials}
              </div>
              <span className="hidden sm:block text-sm font-medium text-amber-500">Super Admin</span>
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
