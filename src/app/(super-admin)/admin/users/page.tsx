import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Search, ShieldAlert, ShieldCheck, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { IS_FREE_MODE } from "@/lib/app-mode"
import { UserActions } from "@/components/admin/user-actions"


const ITEMS_PER_PAGE = 10

export default async function ManageUsersPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string }
}) {
  const session = await auth()
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/login")

  const query = searchParams.q || ""
  const currentPage = Number(searchParams.page) || 1
  const skip = (currentPage - 1) * ITEMS_PER_PAGE

  // Build where clause
  const whereClause = {
    OR: [
      { name: { contains: query } },
      { email: { contains: query } },
    ],
    role: { not: "SUPER_ADMIN" as const }
  }

  // Fetch users with search filter and pagination
  const [users, totalUsers] = await Promise.all([
    prisma.user.findMany({
      where: whereClause,
      include: {
        company: {
          include: {
            aiSettings: true,
            emailSetting: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: ITEMS_PER_PAGE,
    }),
    prisma.user.count({ where: whereClause })
  ])

  const totalPages = Math.ceil(totalUsers / ITEMS_PER_PAGE)


  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manage Users</h1>
        <p className="text-gray-500">Search users, review AI and SMTP integrations, and manage access.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Directory</CardTitle>
          <CardDescription>Search by name or email</CardDescription>
          <form className="flex w-full max-w-sm items-center space-x-2 pt-4">
            <Input type="text" name="q" placeholder="Search users..." defaultValue={query} />
            <Button type="submit" variant="secondary">
              <Search className="w-4 h-4 mr-2" /> Search
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">AI Configured</th>
                  <th className="px-4 py-3 font-medium">SMTP Configured</th>
                  {!IS_FREE_MODE && <th className="px-4 py-3 font-medium">Plan</th>}
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No users found.</td></tr>
                )}
                {users.map((u) => {
                  const hasAI = !!(u.company?.aiSettings?.openaiKey || u.company?.aiSettings?.geminiKey || u.company?.aiSettings?.nvidiaKey)
                  const hasSMTP = !!u.company?.emailSetting?.host
                  
                  return (
                    <tr key={u.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium">{u.name || "N/A"}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">{u.company?.name || "No Company"}</td>
                      <td className="px-4 py-3">
                        {hasAI ? (
                          <span className="inline-flex items-center text-emerald-500 gap-1.5 bg-emerald-500/10 px-2 py-1 rounded text-xs font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Yes ({u.company?.aiSettings?.provider})
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-muted-foreground gap-1.5 bg-muted px-2 py-1 rounded text-xs font-medium">
                            <XCircle className="w-3.5 h-3.5" /> No
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {hasSMTP ? (
                          <span className="inline-flex items-center text-emerald-500 gap-1.5 bg-emerald-500/10 px-2 py-1 rounded text-xs font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-muted-foreground gap-1.5 bg-muted px-2 py-1 rounded text-xs font-medium">
                            <XCircle className="w-3.5 h-3.5" /> No
                          </span>
                        )}
                      </td>
                      {!IS_FREE_MODE && (
                        <td className="px-4 py-3">
                          {u.isPro ? (
                            <span className="inline-flex items-center text-white bg-blue-600 px-2 py-1 rounded text-xs font-bold">
                              PRO
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-slate-600 bg-slate-200 px-2 py-1 rounded text-xs font-bold">
                              FREE
                            </span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        {u.isBlocked ? (
                          <span className="inline-flex items-center text-red-500 gap-1.5">
                            <ShieldAlert className="w-4 h-4" /> Blocked
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-emerald-500 gap-1.5">
                            <ShieldCheck className="w-4 h-4" /> Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <UserActions
                          userId={u.id}
                          isPro={u.isPro}
                          isBlocked={u.isBlocked}
                          currentRole={u.role}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6">
              <div className="text-sm text-muted-foreground">
                Showing page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <Link 
                  href={`/admin/users?page=${currentPage - 1}${query ? `&q=${query}` : ''}`} 
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), currentPage <= 1 ? 'pointer-events-none opacity-50' : '')}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Link>
                <Link 
                  href={`/admin/users?page=${currentPage + 1}${query ? `&q=${query}` : ''}`} 
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), currentPage >= totalPages ? 'pointer-events-none opacity-50' : '')}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
