"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Plus, Users, Receipt, FilePlus, Banknote } from "lucide-react"
import Link from "next/link"

const actions = [
  {
    title: "New Invoice",
    description: "Create and send an invoice",
    icon: FileText,
    href: "/invoices/new",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    title: "New Quotation",
    description: "Send an estimate",
    icon: FilePlus,
    href: "/quotations/new",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
  {
    title: "Add Customer",
    description: "Add a new client",
    icon: Users,
    href: "/customers/new",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    title: "Record Expense",
    description: "Log a new expense",
    icon: Banknote,
    href: "/expenses/new",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
  },
]

export function QuickActions() {
  return (
    <Card className="glass glass-card border-white/10 overflow-hidden col-span-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-6">
        {actions.map((action) => (
          <Link
            key={action.title}
            href={action.href}
            className="group flex flex-col gap-3 rounded-xl border border-white/5 bg-white/5 p-4 transition-all hover:bg-white/10 hover:border-white/20"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.bg} transition-transform group-hover:scale-110 group-hover:rotate-3`}>
              <action.icon className={`w-5 h-5 ${action.color}`} />
            </div>
            <div>
              <h3 className="font-medium text-sm text-foreground">{action.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
