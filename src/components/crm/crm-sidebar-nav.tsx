"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { SheetClose } from "@/components/ui/sheet"
import {
  LayoutDashboard,
  Target,
  Users,
  Briefcase,
  CalendarCheck,
  Megaphone,
  Workflow,
  Sparkles,
  BarChart3,
  Settings,
} from "lucide-react"

export const crmNavItems = [
  { href: "/crm/dashboard", label: "Dashboard", icon: LayoutDashboard, badge: null },
  { href: "/crm/leads", label: "Leads", icon: Target, badge: "New" },
  { href: "/crm/contacts", label: "Contacts", icon: Users, badge: null },
  { href: "/crm/deals", label: "Deals / Pipeline", icon: Briefcase, badge: null },
  { href: "/crm/activities", label: "Activities", icon: CalendarCheck, badge: null },
  { href: "/crm/campaigns", label: "Campaigns", icon: Megaphone, badge: null },
  { href: "/crm/workflows", label: "Workflow Studio", icon: Workflow, badge: "Builder" },
  { href: "/crm/ai", label: "AI Assistant", icon: Sparkles, badge: "AI" },
  { href: "/crm/reports", label: "Reports", icon: BarChart3, badge: null },
  { href: "/crm/settings", label: "Settings", icon: Settings, badge: null },
]

export function CrmDesktopNavLinks() {
  const pathname = usePathname()

  return (
    <div className="space-y-1">
      {crmNavItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/crm/dashboard" && pathname.startsWith(item.href))
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            className={cn(
              "group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:translate-x-0.5",
              isActive
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-sm"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
            )}
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
                  isActive
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-white/5 text-muted-foreground group-hover:bg-emerald-500/20 group-hover:text-emerald-400"
                )}
              >
                <item.icon className="h-4 w-4" />
              </span>
              <span>{item.label}</span>
            </div>

            {item.badge && (
              <span
                className={cn(
                  "text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full border",
                  item.badge === "AI"
                    ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
                    : item.badge === "Builder"
                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                )}
              >
                {item.badge}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}

export function CrmMobileNavLinks() {
  const pathname = usePathname()

  return (
    <div className="space-y-1">
      {crmNavItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/crm/dashboard" && pathname.startsWith(item.href))
        return (
          <SheetClose
            key={item.href}
            render={
              <Link
                href={item.href}
                prefetch={false}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
              />
            }
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-muted-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
              </span>
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                {item.badge}
              </span>
            )}
          </SheetClose>
        )
      })}
    </div>
  )
}
