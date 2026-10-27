import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Users,
  Building,
  FileText,
  Activity,
  AlertTriangle,
  MessageSquare,
  BadgeCheck,
  TrendingUp,
  Wrench,
  Mail,
  Terminal,
  Database,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Layers,
  Sparkles,
} from "lucide-react"
import { ProRequestActions } from "@/components/admin/pro-request-actions"
import { AdminAnalyticsCharts } from "@/components/admin/admin-analytics-charts"
import { AdminCompanyFilter } from "@/components/admin/admin-company-filter"
import { AdminEmailLogsTab } from "@/components/admin/admin-email-logs-tab"
import { formatCurrency } from "@/lib/utils"

export default async function SuperAdminDashboard() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  if (session.user.role !== "SUPER_ADMIN") {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground mt-2">Only Super Admins can access this page.</p>
      </div>
    )
  }

  // Measure database latency
  const dbStart = Date.now()
  let dbLatencyMs = 0
  let isDbHealthy = true
  try {
    await prisma.$queryRaw`SELECT 1`
    dbLatencyMs = Date.now() - dbStart
  } catch {
    isDbHealthy = false
  }

  // Fetch all necessary admin data
  const [
    totalUsers,
    totalCompanies,
    totalInvoices,
    totalQuotations,
    invoiceStats,
    totalEmailsCount,
    failedEmailsCount,
    latestUsers,
    recentFeedback,
    systemLogs,
    appErrors,
    companies,
    pendingProRequests,
    recentEmailLogs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.company.count(),
    prisma.invoice.count(),
    prisma.quotation.count(),
    prisma.invoice.aggregate({
      _sum: {
        finalAmount: true,
        amountPaid: true,
        balanceDue: true,
      },
    }),
    prisma.emailLog.count(),
    prisma.emailLog.count({ where: { status: "failed" } }),
    // Users
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { company: true },
    }),
    // Feedback
    prisma.userFeedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: true, company: true },
    }),
    // General Logs (AuditLogs)
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { user: true, company: true },
    }),
    // Application Crashes (AppErrors)
    prisma.appError.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    // Companies
    prisma.company.findMany({
      orderBy: { createdAt: "desc" },
      include: { users: true },
    }),
    // Pending Pro Requests
    prisma.company.findMany({
      where: { proRequestStatus: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: { users: true },
    }),
    // Recent Email logs
    prisma.emailLog.findMany({
      orderBy: { sentAt: "desc" },
      take: 30,
      include: { company: true },
    }),
  ])

  const totalInvoicedValue = invoiceStats._sum.finalAmount || 0
  const totalPaid = invoiceStats._sum.amountPaid || 0
  const totalBalanceDue = invoiceStats._sum.balanceDue || 0
  const emailSuccessRate =
    totalEmailsCount > 0
      ? Math.round(((totalEmailsCount - failedEmailsCount) / totalEmailsCount) * 100)
      : 100

  const proCompaniesCount = companies.filter(
    (c) => c.subscriptionTier === "PRO" || c.subscriptionTier === "ENTERPRISE"
  ).length
  const now = new Date()
  const activeTrialsCount = companies.filter(
    (c) => c.trialEndsAt && new Date(c.trialEndsAt) > now
  ).length

  // Monthly Growth calculations
  const [userGrowthRaw, companyGrowthRaw, invoiceGrowthRaw] = await Promise.all([
    prisma.user.findMany({ select: { createdAt: true } }),
    prisma.company.findMany({ select: { createdAt: true } }),
    prisma.invoice.findMany({ select: { date: true, finalAmount: true } }),
  ])

  const formatMonth = (date: Date) => {
    return date.toLocaleString("en-US", { month: "short", year: "2-digit" })
  }

  const userMonthlyMap: Record<string, number> = {}
  const companyMonthlyMap: Record<string, number> = {}
  const invoiceMonthlyMap: Record<string, number> = {}

  const monthsList: string[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    monthsList.push(formatMonth(d))
  }

  monthsList.forEach((m) => {
    userMonthlyMap[m] = 0
    companyMonthlyMap[m] = 0
    invoiceMonthlyMap[m] = 0
  })

  userGrowthRaw.forEach((u) => {
    const m = formatMonth(u.createdAt)
    if (m in userMonthlyMap) userMonthlyMap[m]++
  })

  companyGrowthRaw.forEach((c) => {
    const m = formatMonth(c.createdAt)
    if (m in companyMonthlyMap) companyMonthlyMap[m]++
  })

  invoiceGrowthRaw.forEach((inv) => {
    const m = formatMonth(inv.date)
    if (m in invoiceMonthlyMap) invoiceMonthlyMap[m] += inv.finalAmount
  })

  const analyticsData = monthsList.map((month) => ({
    month,
    users: userMonthlyMap[month],
    companies: companyMonthlyMap[month],
    revenue: Math.round(invoiceMonthlyMap[month]),
  }))

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-12">
      {/* ── Top Header & System Ribbon ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Centralized Admin Access</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              Global Telemetry
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Global monitoring, tenant lifecycle, billing pipeline, errors, and system tools.
          </p>
        </div>

        {/* Live System Ribbon */}
        <div className="flex items-center gap-3 text-xs bg-slate-900/80 border border-white/10 px-3.5 py-2 rounded-xl">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isDbHealthy ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
              }`}
            />
            <span className="text-muted-foreground">Database:</span>
            <span className="font-mono font-semibold text-slate-200">
              {isDbHealthy ? `${dbLatencyMs}ms` : "Down"}
            </span>
          </div>

          <div className="h-4 w-px bg-white/10" />

          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Pro Tenants:</span>
            <span className="font-semibold text-indigo-400">{proCompaniesCount}</span>
          </div>

          <div className="h-4 w-px bg-white/10" />

          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Active Trials:</span>
            <span className="font-semibold text-amber-400">{activeTrialsCount}</span>
          </div>
        </div>
      </div>

      {/* ── Quick Operations Command Ribbon ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <Link
          href="/admin/tools"
          className="group p-3.5 rounded-xl border border-white/10 bg-slate-900/60 hover:bg-white/5 hover:border-amber-500/30 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <span className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Wrench className="w-4 h-4" />
            </span>
            <div className="text-left">
              <div className="text-xs font-semibold text-slate-200">Admin Tools</div>
              <div className="text-[10px] text-muted-foreground">Diagnostics &amp; Keys</div>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </Link>

        <Link
          href="/admin/tools"
          className="group p-3.5 rounded-xl border border-white/10 bg-slate-900/60 hover:bg-white/5 hover:border-amber-500/30 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <span className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </span>
            <div className="text-left">
              <div className="text-xs font-semibold text-slate-200">Cron Dispatcher</div>
              <div className="text-[10px] text-muted-foreground">Recurring Invoices</div>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </Link>

        <Link
          href="/admin/health"
          className="group p-3.5 rounded-xl border border-white/10 bg-slate-900/60 hover:bg-white/5 hover:border-amber-500/30 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <span className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Activity className="w-4 h-4" />
            </span>
            <div className="text-left">
              <div className="text-xs font-semibold text-slate-200">Health Check</div>
              <div className="text-[10px] text-muted-foreground">CPU &amp; Memory</div>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </Link>

        <Link
          href="/admin/sql"
          className="group p-3.5 rounded-xl border border-white/10 bg-slate-900/60 hover:bg-white/5 hover:border-amber-500/30 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <span className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Terminal className="w-4 h-4" />
            </span>
            <div className="text-left">
              <div className="text-xs font-semibold text-slate-200">SQL Console</div>
              <div className="text-[10px] text-muted-foreground">Raw DB Queries</div>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </Link>

        <Link
          href="/admin/import"
          className="group p-3.5 rounded-xl border border-white/10 bg-slate-900/60 hover:bg-white/5 hover:border-amber-500/30 transition-all flex items-center justify-between col-span-2 sm:col-span-4 lg:col-span-1"
        >
          <div className="flex items-center gap-2.5">
            <span className="h-8 w-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Database className="w-4 h-4" />
            </span>
            <div className="text-left">
              <div className="text-xs font-semibold text-slate-200">Backup &amp; Restore</div>
              <div className="text-[10px] text-muted-foreground">Export JSON Dump</div>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* ── Key Performance Indicators (KPIs) ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Users */}
        <Card className="border-white/10 bg-slate-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Registered Users
            </CardTitle>
            <span className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-slate-100">{totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all registered tenant workspaces
            </p>
          </CardContent>
        </Card>

        {/* Total Companies & Plans */}
        <Card className="border-white/10 bg-slate-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Tenant Companies
            </CardTitle>
            <span className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Building className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-slate-100">{totalCompanies}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <b className="text-emerald-400 font-semibold">{proCompaniesCount} Pro</b> •{" "}
              <b className="text-amber-400 font-semibold">{activeTrialsCount} in Trial</b>
            </p>
          </CardContent>
        </Card>

        {/* Invoices & Volume */}
        <Card className="border-white/10 bg-slate-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Invoiced Volume
            </CardTitle>
            <span className="h-8 w-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <FileText className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-sky-400">
              {formatCurrency(totalInvoicedValue, "INR")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalInvoices} invoices generated ({totalQuotations} quotes)
            </p>
          </CardContent>
        </Card>

        {/* Email Deliverability */}
        <Card className="border-white/10 bg-slate-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Email Deliverability
            </CardTitle>
            <span className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Mail className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-amber-400">{emailSuccessRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalEmailsCount} dispatched ({failedEmailsCount} failures)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Dashboard Tabs ── */}
      <Tabs defaultValue="companies" className="w-full space-y-6">
        <TabsList className="flex w-full overflow-x-auto justify-start lg:grid lg:grid-cols-8 p-1 bg-slate-900/80 border border-white/10 rounded-xl no-scrollbar">
          <TabsTrigger value="companies" className="gap-2 text-xs shrink-0 font-medium">
            <Building className="w-3.5 h-3.5 text-indigo-400" />
            Companies
          </TabsTrigger>

          <TabsTrigger value="users" className="gap-2 text-xs shrink-0 font-medium">
            <Users className="w-3.5 h-3.5 text-sky-400" />
            Users
          </TabsTrigger>

          <TabsTrigger value="requests" className="gap-2 text-xs shrink-0 font-medium">
            <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
            Pro Requests
            {pendingProRequests.length > 0 && (
              <span className="ml-1.5 bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {pendingProRequests.length}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger value="email-logs" className="gap-2 text-xs shrink-0 font-medium">
            <Mail className="w-3.5 h-3.5 text-amber-400" />
            Email Logs
          </TabsTrigger>

          <TabsTrigger value="logs" className="gap-2 text-xs shrink-0 font-medium">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            Audit Logs
          </TabsTrigger>

          <TabsTrigger value="errors" className="gap-2 text-xs shrink-0 font-medium">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            Errors
          </TabsTrigger>

          <TabsTrigger value="feedback" className="gap-2 text-xs shrink-0 font-medium">
            <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
            Feedback
          </TabsTrigger>

          <TabsTrigger value="analytics" className="gap-2 text-xs shrink-0 font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Companies (with Interactive Search & Filters) ── */}
        <TabsContent value="companies" className="space-y-4 mt-0">
          <Card className="border-white/10">
            <CardHeader>
              <CardTitle>Company Management &amp; Trial Overrides</CardTitle>
              <CardDescription>
                Search tenants, filter by subscription plan, and grant trial extensions in real-time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdminCompanyFilter companies={companies} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Users ── */}
        <TabsContent value="users" className="space-y-4 mt-0">
          <Card className="border-white/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Latest Registrations</CardTitle>
                <CardDescription>Recently joined users across all tenants.</CardDescription>
              </div>
              <Link href="/admin/users">
                <span className="text-xs text-amber-400 hover:underline inline-flex items-center gap-1 font-medium">
                  View Full Directory <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-slate-900/80">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Role</th>
                      <th className="px-4 py-3 font-medium">Company</th>
                      <th className="px-4 py-3 font-medium">Joined At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-slate-950/40">
                    {latestUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-100">{u.name || "N/A"}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-300">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-medium">
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {u.company?.name || <span className="text-muted-foreground">No Company</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {u.createdAt.toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Pro Requests ── */}
        <TabsContent value="requests" className="space-y-4 mt-0">
          <Card className="border-white/10">
            <CardHeader>
              <CardTitle>Pro Upgrade Requests</CardTitle>
              <CardDescription>
                Review and approve tenant companies requesting manual upgrade to the Pro tier.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-slate-900/80">
                    <tr>
                      <th className="px-4 py-3 font-medium">Company Name</th>
                      <th className="px-4 py-3 font-medium">Current Plan</th>
                      <th className="px-4 py-3 font-medium">Contact / Owner</th>
                      <th className="px-4 py-3 font-medium">Joined Date</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-slate-950/40">
                    {pendingProRequests.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                          No pending requests at the moment.
                        </td>
                      </tr>
                    ) : (
                      pendingProRequests.map((c) => {
                        const owner = c.users.find((u) => u.role === "BUSINESS_OWNER") || c.users[0]
                        return (
                          <tr key={c.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 font-semibold">
                              <div className="text-slate-100">{c.name || "Unnamed Company"}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">{c.id}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center rounded-md bg-slate-500/10 text-slate-400 border border-slate-500/20 px-2 py-0.5 text-xs font-semibold">
                                {c.subscriptionTier}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-slate-200">{owner?.name || "N/A"}</div>
                              <div className="text-xs text-muted-foreground">{owner?.email}</div>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {new Date(c.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <ProRequestActions companyId={c.id} />
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Email Logs (NEW!) ── */}
        <TabsContent value="email-logs" className="space-y-4 mt-0">
          <Card className="border-white/10">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-amber-400" />
                  Email Gateway Deliverability &amp; Logs
                </CardTitle>
                <CardDescription>
                  Real-time status of outgoing system invoices, reset tokens, and customer campaign emails.
                </CardDescription>
              </div>
              <Link href="/admin/tools">
                <span className="text-xs text-amber-400 hover:underline inline-flex items-center gap-1 font-medium">
                  SMTP Diagnostic Tester <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </CardHeader>
            <CardContent>
              <AdminEmailLogsTab emailLogs={recentEmailLogs} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Audit Logs ── */}
        <TabsContent value="logs" className="space-y-4 mt-0">
          <Card className="border-white/10">
            <CardHeader>
              <CardTitle>System Audit Logs</CardTitle>
              <CardDescription>Track critical administrative and tenant actions.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-slate-900/80">
                    <tr>
                      <th className="px-4 py-3 font-medium">Timestamp</th>
                      <th className="px-4 py-3 font-medium">User</th>
                      <th className="px-4 py-3 font-medium">Tenant</th>
                      <th className="px-4 py-3 font-medium">Action</th>
                      <th className="px-4 py-3 font-medium">Entity &amp; ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-slate-950/40">
                    {systemLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                          No audit logs recorded yet.
                        </td>
                      </tr>
                    ) : (
                      systemLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground font-mono">
                            {log.createdAt.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-200">{log.user?.email || "System"}</td>
                          <td className="px-4 py-3 text-xs text-slate-300">{log.company?.name || "Global"}</td>
                          <td className="px-4 py-3 font-medium text-xs text-amber-400">{log.action}</td>
                          <td className="px-4 py-3 text-xs font-mono text-slate-400">
                            {log.entity} ({log.entityId || "—"})
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Errors ── */}
        <TabsContent value="errors" className="space-y-4 mt-0">
          <Card className="border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                Application Crashes &amp; Exceptions
              </CardTitle>
              <CardDescription>
                Global React error boundaries, 500 server crashes, and uncaught exceptions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-slate-900/80">
                    <tr>
                      <th className="px-4 py-3 font-medium w-48">Timestamp</th>
                      <th className="px-4 py-3 font-medium w-48">Route / Path</th>
                      <th className="px-4 py-3 font-medium">Error Message</th>
                      <th className="px-4 py-3 font-medium w-32">Digest</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-slate-950/40">
                    {appErrors.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-emerald-400 font-medium text-sm">
                          ✨ Zero application crashes detected. All systems healthy!
                        </td>
                      </tr>
                    ) : (
                      appErrors.map((err) => (
                        <tr key={err.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground font-mono">
                            {err.createdAt.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 truncate text-xs text-slate-200">{err.path || "N/A"}</td>
                          <td className="px-4 py-3 text-rose-400 max-w-md truncate font-mono text-xs">
                            {err.message}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                            {err.digest || "N/A"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Feedback ── */}
        <TabsContent value="feedback" className="space-y-4 mt-0">
          <Card className="border-white/10">
            <CardHeader>
              <CardTitle>User Feedback</CardTitle>
              <CardDescription>Direct feedback submitted via the Random Feedback Modal.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-slate-900/80">
                    <tr>
                      <th className="px-4 py-3 font-medium">Time</th>
                      <th className="px-4 py-3 font-medium">User</th>
                      <th className="px-4 py-3 font-medium">Rating</th>
                      <th className="px-4 py-3 font-medium">Comments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-slate-950/40">
                    {recentFeedback.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">
                          No feedback received yet.
                        </td>
                      </tr>
                    ) : (
                      recentFeedback.map((fb) => (
                        <tr key={fb.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                            {fb.createdAt.toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <div className="font-semibold text-slate-100">{fb.user.name || "User"}</div>
                            <div className="text-slate-400">{fb.user.email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold ${
                                fb.rating >= 4
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : fb.rating === 3
                                  ? "bg-amber-500/10 text-amber-400"
                                  : "bg-rose-500/10 text-rose-400"
                              }`}
                            >
                              {fb.rating} / 5
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-200 max-w-lg">
                            {fb.comments || (
                              <span className="text-muted-foreground italic">No comment provided</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Analytics ── */}
        <TabsContent value="analytics" className="space-y-4 mt-0">
          <AdminAnalyticsCharts data={analyticsData} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
