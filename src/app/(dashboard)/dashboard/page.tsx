import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getDashboardStats } from "@/services/dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import { formatINR } from "@/services/tax-engine"
import {
  IndianRupee, Users, FileText, AlertTriangle,
  TrendingUp, Clock, ReceiptText, Shield
} from "lucide-react"
import { redirect } from "next/navigation"

// Always fetch fresh data — never serve a cached version
export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { company: true },
  })

  if (!user?.companyId) redirect("/settings")

  const stats = await getDashboardStats(user.companyId)

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  const statCards = [
    {
      label: "Total Revenue",
      value: formatINR(stats.totalRevenue),
      sub: "Total billed amount",
      icon: IndianRupee,
      iconBg: "bg-emerald-500/15",
      iconColor: "text-emerald-400",
      glow: "hover:shadow-emerald-500/10",
    },
    {
      label: "Pending Amount",
      value: formatINR(stats.pendingAmount),
      sub: "Awaiting payment",
      icon: Clock,
      iconBg: "bg-blue-500/15",
      iconColor: "text-blue-400",
      glow: "hover:shadow-blue-500/10",
    },
    {
      label: "Overdue",
      value: formatINR(stats.overdueAmount),
      sub: "Requires follow-up",
      icon: AlertTriangle,
      iconBg: "bg-red-500/15",
      iconColor: "text-red-400",
      glow: "hover:shadow-red-500/10",
    },
    {
      label: "Active Customers",
      value: stats.activeCustomers,
      sub: "Total clients",
      icon: Users,
      iconBg: "bg-violet-500/15",
      iconColor: "text-violet-400",
      glow: "hover:shadow-violet-500/10",
    },
  ]

  const taxCards = [
    {
      label: "GST Collected",
      value: formatINR(stats.gstCollected),
      icon: Shield,
      iconColor: "text-indigo-400",
      iconBg: "bg-indigo-500/15",
    },
    {
      label: "TDS Deducted",
      value: formatINR(stats.tdsDeducted),
      icon: TrendingUp,
      iconColor: "text-orange-400",
      iconBg: "bg-orange-500/15",
    },
    {
      label: "Invoices Sent",
      value: stats.invoicesSent,
      icon: ReceiptText,
      iconColor: "text-teal-400",
      iconBg: "bg-teal-500/15",
    },
  ]

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting}{user.name ? `, ${user.name.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {user.company?.name ?? "Your Business"} &middot; Here&apos;s your overview for today
        </p>
      </div>

      {/* ── Primary Stats ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card
            key={card.label}
            className={`glass glass-card border-white/10 transition-all duration-300 hover:shadow-xl ${card.glow}`}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">{card.label}</CardTitle>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.iconBg}`}>
                <card.icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── GST / TDS Stats ── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {taxCards.map((card) => (
          <Card key={card.label} className="glass glass-card border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconBg}`}>
                  <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="text-xl font-bold mt-0.5">{card.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator className="bg-white/8" />

      {/* ── Revenue Chart ── */}
      <Card className="glass glass-card border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-primary" />
            Revenue Overview
          </CardTitle>
          <p className="text-xs text-muted-foreground">Monthly revenue for the last 6 months</p>
        </CardHeader>
        <Separator className="bg-white/8" />
        <CardContent className="pt-4">
          <RevenueChart data={stats.monthlyRevenue} />
        </CardContent>
      </Card>
    </div>
  )
}
