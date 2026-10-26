import Link from "next/link"
import { getCrmDashboardStats } from "@/actions/crm"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Briefcase,
  Target,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertCircle,
  Calendar,
  Sparkles,
  Workflow,
  ArrowRight,
  Phone,
  Mail,
  UserCheck,
} from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "CRM Dashboard | Sales & Pipeline Overview",
  description: "Sales overview, pipeline KPIs, task schedule, and recent activity.",
}

export default async function CrmDashboardPage() {
  const result = await getCrmDashboardStats()
  const stats = result.stats || {
    totalPipelineValue: 0,
    totalWonRevenue: 0,
    totalLostRevenue: 0,
    totalDeals: 0,
    totalLeads: 0,
    leadConversionRate: 0,
    pendingActivitiesCount: 0,
    overdueTasks: 0,
    stageDistribution: [],
    pendingActivities: [],
    recentActivities: [],
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header & Welcome Banner ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            Sales Overview & Activity
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time pipeline metrics, automated workflows, and pending sales tasks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/crm/ai">
            <Button variant="outline" className="h-9 gap-2 rounded-xl border-violet-500/30 hover:bg-violet-500/10 text-violet-400 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>CRM AI Copilot</span>
            </Button>
          </Link>
          <Link href="/crm/workflows">
            <Button variant="outline" className="h-9 gap-2 rounded-xl border-white/10 hover:bg-white/5 text-xs font-semibold">
              <Workflow className="h-3.5 w-3.5 text-indigo-400" />
              <span>Workflow Studio</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Key Performance Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass border-white/10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Pipeline Value
            </CardTitle>
            <Briefcase className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              ₹{stats.totalPipelineValue.toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="font-semibold text-emerald-400">{stats.totalDeals}</span> active opportunities
            </p>
          </CardContent>
        </Card>

        <Card className="glass border-white/10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Closed Won Revenue
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              ₹{stats.totalWonRevenue.toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Won business across this fiscal cycle
            </p>
          </CardContent>
        </Card>

        <Card className="glass border-white/10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Leads & Conversion
            </CardTitle>
            <Target className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground flex items-baseline gap-2">
              <span>{stats.totalLeads}</span>
              <span className="text-xs font-semibold text-purple-400">({stats.leadConversionRate}%)</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Captured leads with {stats.leadConversionRate}% qualification rate
            </p>
          </CardContent>
        </Card>

        <Card className="glass border-white/10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-red-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pending Actions
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground flex items-baseline gap-2">
              <span>{stats.pendingActivitiesCount}</span>
              {stats.overdueTasks > 0 && (
                <span className="text-xs font-bold text-red-400">({stats.overdueTasks} overdue)</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Tasks, calls & scheduled meetings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Pipeline Stages Distribution ── */}
      <Card className="glass border-white/10 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base font-bold text-foreground">Pipeline Stage Distribution</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Visual breakdown of active opportunities progressing toward close
            </CardDescription>
          </div>
          <Link href="/crm/deals" className="text-xs font-medium text-emerald-400 hover:underline flex items-center gap-1">
            Kanban Board <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-2">
            {stats.stageDistribution.map((stage: any) => (
              <div
                key={stage.id}
                className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground truncate">{stage.name}</span>
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: stage.color || "#3b82f6" }}
                  />
                </div>
                <div>
                  <div className="text-lg font-bold text-foreground">
                    {stage.count} <span className="text-xs font-normal text-muted-foreground">deals</span>
                  </div>
                  <div className="text-xs font-semibold text-emerald-400 mt-0.5">
                    ₹{stage.value.toLocaleString("en-IN")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Two Column: Pending Tasks & Recent Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Tasks & Meetings */}
        <Card className="glass border-white/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-400" />
                Scheduled Tasks & Meetings
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Action items requiring immediate follow-up
              </CardDescription>
            </div>
            <Link href="/crm/activities">
              <Button variant="ghost" size="sm" className="text-xs h-8">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {stats.pendingActivities.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No pending tasks right now. Great job keeping the inbox clean!
              </div>
            ) : (
              stats.pendingActivities.map((act: any) => (
                <div
                  key={act.id}
                  className="flex items-start justify-between p-3 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {act.type === "CALL" ? (
                        <Phone className="h-4 w-4 text-emerald-400" />
                      ) : act.type === "EMAIL" ? (
                        <Mail className="h-4 w-4 text-blue-400" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-purple-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground leading-snug">{act.title}</p>
                      {act.customer && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Client: {act.customer.companyName || act.customer.name}
                        </p>
                      )}
                      {act.deal && (
                        <p className="text-[11px] text-emerald-400 mt-0.5 font-medium">
                          Deal: {act.deal.title}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-white/15">
                      {act.type}
                    </Badge>
                    {act.dueDate && (
                      <p className={`text-[10px] mt-1 font-medium ${
                        new Date(act.dueDate) < new Date() ? "text-red-400" : "text-muted-foreground"
                      }`}>
                        {new Date(act.dueDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent CRM Audit & Timeline Activity */}
        <Card className="glass border-white/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-400" />
                Recent Sales Activities
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Chronological log of customer interactions and deal updates
              </CardDescription>
            </div>
            <Link href="/crm/activities">
              <Button variant="ghost" size="sm" className="text-xs h-8">
                Timeline
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.recentActivities.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No recent activity logged yet. Add leads or create deals to get started.
              </div>
            ) : (
              stats.recentActivities.map((act: any) => (
                <div key={act.id} className="flex items-start gap-3 text-xs border-b border-white/5 pb-2.5 last:border-0 last:pb-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{act.title}</p>
                    {act.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{act.description}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(act.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
