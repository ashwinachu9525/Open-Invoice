"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { SheetClose } from "@/components/ui/sheet"

import { FileText, Home, Users, Settings, BarChart3, Sparkles, Package, Mail, Receipt, HelpCircle } from "lucide-react"

export const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home, tourId: "tour-dashboard" },
  { href: "/invoices", label: "Invoices", icon: FileText, tourId: "tour-invoices" },
  { href: "/quotations", label: "Quotations", icon: FileText },
  { href: "/customers", label: "Customers", icon: Users, tourId: "tour-customers" },
  { href: "/catalog", label: "Catalog", icon: Package },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/email-logs", label: "Email Logs", icon: Mail },
  { href: "/ai", label: "AI Tools", icon: Sparkles, tourId: "tour-ai-tools" },
  { href: "/help", label: "Help Center", icon: HelpCircle },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function DesktopNavLinks() {
  const pathname = usePathname()
  
  return (
    <>
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.href}
            href={item.href}
            id={item.tourId}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:translate-x-0.5",
              isActive 
                ? "bg-white/10 text-white shadow-sm" 
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
            )}
          >
            <span className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
              isActive 
                ? "bg-primary/20 text-primary" 
                : "bg-white/5 group-hover:bg-primary/20 group-hover:text-primary"
            )}>
              <item.icon className="h-4 w-4" />
            </span>
            {item.label}
          </Link>
        )
      })}
    </>
  )
}

export function MobileNavLinks() {
  const pathname = usePathname()
  
  return (
    <>
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <SheetClose
            key={item.href}
            render={
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  isActive 
                    ? "bg-white/10 text-white" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
              />
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </SheetClose>
        )
      })}
    </>
  )
}
