"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  Building2, 
  CreditCard, 
  Globe, 
  MessageSquare, 
  Palette, 
  Hash, 
  Bell, 
  Code, 
  Webhook, 
  Sparkles, 
  ShieldCheck, 
  Users, 
  Banknote,
  ChevronDown,
  Menu,
  LayoutDashboard
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: "General",
    items: [
      { title: "Company Profile", href: "/settings", icon: Building2 },
      { title: "Bank Accounts", href: "/settings/bank-accounts", icon: Banknote },
      { title: "Public Showcase", href: "/settings/profile", icon: Globe },
    ]
  },
  {
    title: "Integrations",
    items: [
      { title: "WhatsApp & Email", href: "/settings/integrations", icon: MessageSquare },
    ]
  },
  {
    title: "Preferences",
    items: [
      { title: "Appearance", href: "/settings/appearance", icon: Palette },
      { title: "Dashboard Layout", href: "/settings/dashboard", icon: LayoutDashboard },
      { title: "Invoice Settings", href: "/settings/invoice", icon: Hash },
      { title: "Notifications", href: "/settings/notifications", icon: Bell },
      { title: "Keyboard Shortcuts", href: "/settings/shortcuts", icon: Code },
    ]
  },
  {
    title: "Advanced & Developer",
    items: [
      { title: "Developer Options", href: "/settings/developer", icon: Code },
      { title: "Webhooks", href: "/settings/webhooks", icon: Webhook },
      { title: "AI Settings", href: "/settings/ai", icon: Sparkles },
    ]
  },
  {
    title: "Security & Team",
    items: [
      { title: "Security & Privacy", href: "/settings/security", icon: ShieldCheck },
      { title: "Team Management", href: "/settings/team", icon: Users },
    ]
  },
  {
    title: "Billing",
    items: [
      { title: "Subscription", href: "/settings/billing", icon: CreditCard },
    ]
  }
]

export function SettingsNav() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  // Find current active item for mobile dropdown label
  const activeItem = navSections.flatMap(s => s.items).find(item => item.href === pathname) || navSections[0].items[0]

  return (
    <div className="flex flex-col w-full md:w-64 flex-shrink-0 md:border-r border-white/5 md:pr-6 gap-4 md:h-[calc(100vh-8rem)]">
      {/* Mobile Nav Toggle */}
      <div className="md:hidden">
        <Button 
          variant="outline" 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex justify-between items-center bg-white/5 border-white/10"
        >
          <div className="flex items-center gap-2">
            <activeItem.icon className="w-4 h-4" />
            {activeItem.title}
          </div>
          <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
        </Button>
      </div>

      {/* Nav Content */}
      <div className={cn("md:block overflow-y-auto h-full pr-2", isOpen ? "block" : "hidden")}>
        <nav className="space-y-6 pb-8">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
                {section.title}
              </h4>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-all duration-200",
                        isActive 
                          ? "bg-indigo-500/10 text-indigo-400 font-medium" 
                          : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                      )}
                    >
                      <item.icon className={cn("w-4 h-4", isActive ? "text-indigo-400" : "text-slate-500")} />
                      {item.title}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </div>
  )
}
