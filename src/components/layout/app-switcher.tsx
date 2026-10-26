"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Receipt, Target, Check, ChevronsUpDown, Sparkles } from "lucide-react"

export function AppSwitcher() {
  const pathname = usePathname()
  const isCrm = pathname.startsWith("/crm")
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="w-full flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-left group cursor-pointer"
        title="Switch Platform Experience"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm ${
            isCrm 
              ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/20"
              : "bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-violet-500/20"
          }`}>
            {isCrm ? <Target className="h-4 w-4" /> : <Receipt className="h-4 w-4" />}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold truncate text-foreground">
                {isCrm ? "Sales CRM" : "Invoicing Suite"}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-primary/10 text-primary">
                {isCrm ? "CRM" : "GST"}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground truncate">
              {isCrm ? "Pipelines & Workflows" : "Billing & Compliance"}
            </span>
          </div>
        </div>
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0 ml-1 transition-colors" />
      </PopoverTrigger>

      <PopoverContent className="w-64 p-2 shadow-2xl rounded-2xl glass border-white/10" align="start">
        <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Platform Suites
        </div>
        <div className="space-y-1">
          {/* Invoicing Suite */}
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className={`flex items-start justify-between p-2.5 rounded-xl transition-all ${
              !isCrm
                ? "bg-primary/10 border border-primary/20 text-foreground"
                : "hover:bg-white/5 text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white shrink-0 mt-0.5">
                <Receipt className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-xs font-semibold leading-tight text-foreground">Invoicing Suite</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Tax Invoices, Quotes, GST & Expenses</p>
              </div>
            </div>
            {!isCrm && <Check className="h-4 w-4 text-primary shrink-0 mt-1" />}
          </Link>

          {/* CRM Suite */}
          <Link
            href="/crm/dashboard"
            onClick={() => setOpen(false)}
            className={`flex items-start justify-between p-2.5 rounded-xl transition-all ${
              isCrm
                ? "bg-emerald-500/10 border border-emerald-500/20 text-foreground"
                : "hover:bg-white/5 text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shrink-0 mt-0.5">
                <Target className="h-3.5 w-3.5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold leading-tight text-foreground">Sales CRM</p>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-emerald-500/30 text-emerald-500">
                    Active
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Leads, Deals, Workflows & AI</p>
              </div>
            </div>
            {isCrm && <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-1" />}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
