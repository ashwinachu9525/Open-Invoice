import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Building, FileText, Activity, AlertTriangle, MessageSquare, BadgeCheck } from "lucide-react"
import { ExtendTrialButton } from "@/components/admin/extend-trial-button"
import { ProRequestActions } from "@/components/admin/pro-request-actions"

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

  // Fetch all necessary admin data
  const [
    totalUsers, 
    totalCompanies, 
    totalInvoices, 
    totalQuotations,
    latestUsers,
    recentFeedback,
    systemLogs,
    errorLogs,
    appErrors,
    companies,
    pendingProRequests
  ] = await Promise.all([
    prisma.user.count(),
    prisma.company.count(),
    prisma.invoice.count(),
    prisma.quotation.count(),
    // Users
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { company: true }
    }),
    // Feedback
    prisma.userFeedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: true, company: true }
    }),
    // General Logs (AuditLogs)
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { user: true, company: true }
    }),
    // Errors (Failed emails or specific error logs)
    prisma.emailLog.findMany({
      where: { status: "failed" },
      orderBy: { sentAt: "desc" },
      take: 15,
      include: { company: true }
    }),
    // Application Crashes (AppErrors)
    prisma.appError.findMany({
      orderBy: { createdAt: "desc" },
      take: 15
    }),
    // Companies
    prisma.company.findMany({
      orderBy: { createdAt: "desc" },
      include: { users: true }
    }),
    // Pending Pro Requests
    prisma.company.findMany({
      where: { proRequestStatus: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: { users: true }
    })
  ])

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Centralized Admin Access</h1>
        <p className="text-gray-500">Global monitoring, logs, errors, and user feedback.</p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-6 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCompanies}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoices Created</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvoices}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quotations Created</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuotations}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-6 lg:w-[850px]">
          <TabsTrigger value="users"><Users className="w-4 h-4 mr-2"/> Users</TabsTrigger>
          <TabsTrigger value="companies"><Building className="w-4 h-4 mr-2"/> Companies</TabsTrigger>
          <TabsTrigger value="requests">
            <BadgeCheck className="w-4 h-4 mr-2"/> Pro Requests
            {pendingProRequests.length > 0 && (
              <span className="ml-2 bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingProRequests.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="logs"><Activity className="w-4 h-4 mr-2"/> Audit Logs</TabsTrigger>
          <TabsTrigger value="errors"><AlertTriangle className="w-4 h-4 mr-2"/> Errors</TabsTrigger>
          <TabsTrigger value="feedback"><MessageSquare className="w-4 h-4 mr-2"/> Feedback</TabsTrigger>
        </TabsList>

        {/* Tab: Users */}
        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Latest Registrations</CardTitle>
              <CardDescription>Recently joined users across all tenants.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Role</th>
                      <th className="px-4 py-3 font-medium">Company</th>
                      <th className="px-4 py-3 font-medium">Joined At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {latestUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">{u.name || "N/A"}</td>
                        <td className="px-4 py-3">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium">
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">{u.company?.name || "No Company"}</td>
                        <td className="px-4 py-3">{u.createdAt.toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Companies */}
        <TabsContent value="companies" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Management & Trial Overrides</CardTitle>
              <CardDescription>Monitor company subscription plans, active trials, and extend trial durations.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 font-medium">Company Name</th>
                      <th className="px-4 py-3 font-medium">Plan Tier</th>
                      <th className="px-4 py-3 font-medium">Trial Start</th>
                      <th className="px-4 py-3 font-medium">Trial End</th>
                      <th className="px-4 py-3 font-medium">Days Left / Status</th>
                      <th className="px-4 py-3 font-medium">Reminder Email</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {companies.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">No companies found.</td></tr>
                    )}
                    {companies.map((c) => {
                      const now = new Date()
                      const endsDate = c.trialEndsAt ? new Date(c.trialEndsAt) : null
                      const isTrialActive = endsDate && now < endsDate
                      const isTrialExpired = endsDate && now >= endsDate

                      let daysRemaining = 0
                      if (endsDate && isTrialActive) {
                        const diffTime = endsDate.getTime() - now.getTime()
                        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                      }

                      return (
                        <tr key={c.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 font-semibold">
                            <div>{c.name || "Unnamed Company"}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{c.id}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${
                              c.subscriptionTier === "PRO" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                              c.subscriptionTier === "ENTERPRISE" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                              isTrialActive ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                              "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                            }`}>
                              {isTrialActive ? "TRIAL (PRO)" : c.subscriptionTier}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {c.trialStartsAt ? new Date(c.trialStartsAt).toLocaleDateString() : "N/A"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {c.trialEndsAt ? new Date(c.trialEndsAt).toLocaleDateString() : "N/A"}
                          </td>
                          <td className="px-4 py-3">
                            {isTrialActive ? (
                              <span className="text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                                {daysRemaining} days left
                              </span>
                            ) : isTrialExpired ? (
                              <span className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                                Expired
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">No Trial</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {c.trialReminderSent ? (
                              <span className="text-xs text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                                Sent ({new Date(c.trialReminderSent).toLocaleDateString()})
                              </span>
                            ) : c.trialStartsAt ? (
                              <span className="text-xs text-muted-foreground font-semibold">Pending</span>
                            ) : (
                              <span className="text-xs text-muted-foreground font-semibold">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {c.trialStartsAt ? (
                              <ExtendTrialButton companyId={c.id} />
                            ) : (
                              <span className="text-xs text-muted-foreground italic">No trial to extend</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Pro Requests */}
        <TabsContent value="requests" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Pro Upgrade Requests</CardTitle>
              <CardDescription>Review and approve companies requesting to upgrade to the Pro tier.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 font-medium">Company Name</th>
                      <th className="px-4 py-3 font-medium">Current Plan</th>
                      <th className="px-4 py-3 font-medium">Contact / Owner</th>
                      <th className="px-4 py-3 font-medium">Joined Date</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {pendingProRequests.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No pending requests at the moment.</td></tr>
                    )}
                    {pendingProRequests.map((c) => {
                      const owner = c.users.find(u => u.role === "BUSINESS_OWNER") || c.users[0]
                      return (
                        <tr key={c.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 font-semibold">
                            <div>{c.name || "Unnamed Company"}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{c.id}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center rounded-md bg-slate-500/10 text-slate-400 border border-slate-500/20 px-2 py-1 text-xs font-semibold">
                              {c.subscriptionTier}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div>{owner?.name || "N/A"}</div>
                            <div className="text-xs text-muted-foreground">{owner?.email}</div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end">
                              <ProRequestActions companyId={c.id} />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Logs */}
        <TabsContent value="logs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>System Audit Logs</CardTitle>
              <CardDescription>Track critical actions across all tenants.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 font-medium">Time</th>
                      <th className="px-4 py-3 font-medium">User</th>
                      <th className="px-4 py-3 font-medium">Company</th>
                      <th className="px-4 py-3 font-medium">Action</th>
                      <th className="px-4 py-3 font-medium">Entity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {systemLogs.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No logs recorded yet.</td></tr>
                    )}
                    {systemLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{log.createdAt.toLocaleString()}</td>
                        <td className="px-4 py-3">{log.user.email}</td>
                        <td className="px-4 py-3">{log.company.name}</td>
                        <td className="px-4 py-3 font-medium text-blue-500">{log.action}</td>
                        <td className="px-4 py-3">{log.entity} ({log.entityId})</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Errors */}
        <TabsContent value="errors" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Application Crashes</CardTitle>
              <CardDescription>Global React error boundaries and fatal exceptions.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 font-medium w-48">Time</th>
                      <th className="px-4 py-3 font-medium w-48">Path</th>
                      <th className="px-4 py-3 font-medium">Error Message</th>
                      <th className="px-4 py-3 font-medium w-32">Digest</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {appErrors.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-6 text-center text-emerald-500 font-medium">No application crashes detected. System is stable!</td></tr>
                    )}
                    {appErrors.map((err) => (
                      <tr key={err.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{err.createdAt.toLocaleString()}</td>
                        <td className="px-4 py-3 truncate">{err.path || "N/A"}</td>
                        <td className="px-4 py-3 text-red-500 max-w-md truncate font-mono text-xs">{err.message}</td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{err.digest || "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Failed Deliveries</CardTitle>
              <CardDescription>Monitor failed operations such as SMTP dispatches.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 font-medium">Time</th>
                      <th className="px-4 py-3 font-medium">Company</th>
                      <th className="px-4 py-3 font-medium">To</th>
                      <th className="px-4 py-3 font-medium">Error Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {errorLogs.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-6 text-center text-emerald-500 font-medium">No delivery errors detected.</td></tr>
                    )}
                    {errorLogs.map((err) => (
                      <tr key={err.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{err.sentAt.toLocaleString()}</td>
                        <td className="px-4 py-3">{err.company.name}</td>
                        <td className="px-4 py-3">{err.to}</td>
                        <td className="px-4 py-3 text-red-500 max-w-md truncate">{err.error || "Unknown Error"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Feedback */}
        <TabsContent value="feedback" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>User Feedback</CardTitle>
              <CardDescription>Direct feedback submitted via the Random Feedback Modal.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 font-medium">Time</th>
                      <th className="px-4 py-3 font-medium">User</th>
                      <th className="px-4 py-3 font-medium">Rating</th>
                      <th className="px-4 py-3 font-medium">Comments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {recentFeedback.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No feedback received yet.</td></tr>
                    )}
                    {recentFeedback.map((fb) => (
                      <tr key={fb.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{fb.createdAt.toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <div>{fb.user.name}</div>
                          <div className="text-xs text-muted-foreground">{fb.user.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-bold ${
                            fb.rating >= 4 ? 'bg-emerald-500/10 text-emerald-500' :
                            fb.rating === 3 ? 'bg-amber-500/10 text-amber-500' :
                            'bg-red-500/10 text-red-500'
                          }`}>
                            {fb.rating} / 5
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-lg">{fb.comments || <span className="text-muted-foreground italic">No comment provided</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  )
}
