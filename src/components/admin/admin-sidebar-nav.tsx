"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { SheetClose } from "@/components/ui/sheet"
import {
  LayoutDashboard,
  Activity,
  Users,
  Lightbulb,
  Wrench,
  ArchiveRestore,
  Terminal,
  Settings,
  ArrowLeft,
  LayoutGrid,
  ChevronRight,
  ShieldCheck,
} from "lucide-react"

export interface AdminNavCategory {
  title: string
  items: {
    href: string
    label: string
    icon: any
    badge?: string | number | null
    badgeColor?: "amber" | "indigo" | "emerald" | "rose"
  }[]
}

export function getAdminNavCategories(pendingProCount: number = 0): AdminNavCategory[] {
  return [
    {
      title: "Overview",
      items: [
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
        { href: "/admin/health", label: "Health & Telemetry", icon: Activity },
      ],
    },
    {
      title: "User & Tenant Management",
      items: [
        { href: "/admin/users", label: "Manage Users", icon: Users },
        {
          href: "/admin/feature-requests",
          label: "Feature Requests",
          icon: Lightbulb,
        },
      ],
    },
    {
      title: "Operations & Tools",
      items: [
        {
          href: "/admin/tools",
          label: "Admin Tools",
          icon: Wrench,
          badge: "New",
          badgeColor: "amber",
        },
        {
          href: "/admin/import",
          label: "Backup & Restore",
          icon: ArchiveRestore,
        },
        {
          href: "/admin/sql",
          label: "SQL Console",
          icon: Terminal,
        },
      ],
    },
    {
      title: "Platform Configuration",
      items: [
        { href: "/admin/settings", label: "System Settings", icon: Settings },
      ],
    },
  ]
}

export function AdminDesktopNav({ pendingProCount = 0 }: { pendingProCount?: number }) {
  const pathname = usePathname()
  const categories = getAdminNavCategories(pendingProCount)

  return (
    <div className="space-y-6">
      {categories.map((category) => (
        <div key={category.title} className="space-y-1.5">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            {category.title}
          </p>
          <div className="space-y-1">
            {category.items.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className={cn(
                    "group flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 hover:translate-x-0.5",
                    isActive
                      ? "bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/25 shadow-sm shadow-amber-500/10"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200",
                        isActive
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-white/5 text-muted-foreground group-hover:bg-amber-500/20 group-hover:text-amber-400"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                        item.badgeColor === "amber" && "bg-amber-500/20 text-amber-400 border border-amber-500/30",
                        item.badgeColor === "indigo" && "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30",
                        item.badgeColor === "emerald" && "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
                        item.badgeColor === "rose" && "bg-rose-500/20 text-rose-400 border border-rose-500/30",
                        !item.badgeColor && "bg-white/10 text-muted-foreground"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      ))}

      {/* Switch to Main App Dashboard Button */}
      <div className="pt-2 border-t border-white/8">
        <Link
          href="/dashboard"
          className="group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-white/5 transition-all duration-200"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
              <LayoutGrid className="h-3.5 w-3.5" />
            </span>
            <span>Return to App</span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  )
}

export function AdminMobileNav({ pendingProCount = 0 }: { pendingProCount?: number }) {
  const pathname = usePathname()
  const categories = getAdminNavCategories(pendingProCount)

  return (
    <div className="space-y-5 p-3">
      {categories.map((category) => (
        <div key={category.title} className="space-y-1.5">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            {category.title}
          </p>
          <div className="space-y-1">
            {category.items.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`)

              return (
                <SheetClose
                  key={item.href}
                  render={
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/25"
                          : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                      )}
                    />
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-lg",
                        isActive ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-muted-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold uppercase">
                      {item.badge}
                    </span>
                  )}
                </SheetClose>
              )
            })}
          </div>
        </div>
      ))}

      <div className="pt-2 border-t border-white/8">
        <SheetClose
          render={
            <Link
              href="/dashboard"
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-white/5"
            />
          }
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <LayoutGrid className="h-3.5 w-3.5" />
            </span>
            <span>Return to App</span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </SheetClose>
      </div>
    </div>
  )
}
