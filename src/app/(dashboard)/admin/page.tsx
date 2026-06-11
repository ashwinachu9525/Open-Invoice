import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Building, FileText } from "lucide-react"

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

  const [totalUsers, totalCompanies, totalInvoices, latestUsers] = await Promise.all([
    prisma.user.count(),
    prisma.company.count(),
    prisma.invoice.count(),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { company: true }
    })
  ])

  return (
    <div className="flex flex-col gap-8 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Super Admin Dashboard</h1>
        <p className="text-gray-500">Platform overview (Privacy-safe metrics only).</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Joined At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {latestUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">{u.name || "N/A"}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-md bg-white/10 px-2 py-1 text-xs font-medium ring-1 ring-inset ring-white/20">
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
    </div>
  )
}
