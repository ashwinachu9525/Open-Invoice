import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireCompany } from "@/lib/auth-helpers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { revalidatePath } from "next/cache"
import crypto from "crypto"
import { Badge } from "@/components/ui/badge"
import { Users, UserPlus, Mail, Clock, ShieldCheck, Shield, User } from "lucide-react"
import { sendTeamInviteEmail } from "@/services/smtp"

const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
  BUSINESS_OWNER: { label: "Owner",  color: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30" },
  ADMIN:          { label: "Admin",  color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  STAFF:          { label: "Staff",  color: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
}

async function inviteTeamMember(formData: FormData) {
  "use server"
  const { session, company } = await requireCompany()
  if (
    session.user.role !== "BUSINESS_OWNER" &&
    session.user.role !== "SUPER_ADMIN" &&
    session.user.role !== "ADMIN"
  ) {
    throw new Error("Unauthorized to invite team members")
  }

  const email = formData.get("email") as string
  const role = formData.get("role") as any
  if (!email || !role) throw new Error("Email and Role are required")

  const token = crypto.randomBytes(32).toString("hex")

  await prisma.teamInvitation.create({
    data: {
      email,
      companyId: company.id,
      role,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  })

  // Send invitation email via company SMTP (Settings → Email/SMTP)
  try {
    await sendTeamInviteEmail({
      companyId: company.id,
      to: email,
      companyName: company.name,
      inviterName: session.user.name ?? session.user.email ?? "Your team",
      role,
      inviteToken: token,
    })
  } catch (emailErr) {
    // If SMTP is not configured, delete the invitation and surface the error clearly
    await prisma.teamInvitation.delete({ where: { token } })
    throw new Error(
      emailErr instanceof Error ? emailErr.message : "Failed to send invitation email."
    )
  }

  revalidatePath("/settings/team")
}

async function removeTeamMember(formData: FormData) {
  "use server"
  const { session, company } = await requireCompany()
  if (
    session.user.role !== "BUSINESS_OWNER" &&
    session.user.role !== "SUPER_ADMIN" &&
    session.user.role !== "ADMIN"
  ) {
    throw new Error("Unauthorized to remove team members")
  }

  const userId = formData.get("userId") as string
  if (userId === session.user.id) throw new Error("Cannot remove yourself")

  await prisma.user.update({
    where: { id: userId, companyId: company.id },
    data: { companyId: null },
  })

  revalidatePath("/settings/team")
}

async function updateTeamMemberRole(formData: FormData) {
  "use server"
  const { session, company } = await requireCompany()
  if (
    session.user.role !== "BUSINESS_OWNER" &&
    session.user.role !== "SUPER_ADMIN" &&
    session.user.role !== "ADMIN"
  ) {
    throw new Error("Unauthorized to update team member roles")
  }

  const userId = formData.get("userId") as string
  const role = formData.get("role") as any

  if (!userId || !role) throw new Error("User ID and Role are required")
  if (userId === session.user.id) throw new Error("Cannot change your own role here")

  // Prevent setting someone as BUSINESS_OWNER via this form
  if (role === "BUSINESS_OWNER") throw new Error("Cannot assign Owner role via team management")

  await prisma.user.update({
    where: { id: userId, companyId: company.id },
    data: { role },
  })

  revalidatePath("/settings/team")
}

async function cancelInvitation(formData: FormData) {
  "use server"
  const { session, company } = await requireCompany()
  if (
    session.user.role !== "BUSINESS_OWNER" &&
    session.user.role !== "SUPER_ADMIN" &&
    session.user.role !== "ADMIN"
  ) {
    throw new Error("Unauthorized")
  }

  const invId = formData.get("invId") as string
  await prisma.teamInvitation.delete({ where: { id: invId, companyId: company.id } })
  revalidatePath("/settings/team")
}

export default async function TeamSettingsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  if (session.user.role === "STAFF") {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground mt-2">Staff cannot manage team settings.</p>
      </div>
    )
  }

  const { company } = await requireCompany()

  const [teamMembers, invitations] = await Promise.all([
    prisma.user.findMany({ where: { companyId: company.id }, orderBy: { createdAt: "asc" } }),
    prisma.teamInvitation.findMany({ where: { companyId: company.id }, orderBy: { createdAt: "desc" } }),
  ])

  const canManage =
    session.user.role === "BUSINESS_OWNER" ||
    session.user.role === "SUPER_ADMIN" ||
    session.user.role === "ADMIN"

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
        <p className="text-gray-500 mt-1">Invite users and manage roles for {company.name}.</p>
      </div>

      {/* ── Invite Card ── */}
      <Card className="glass glass-card border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-indigo-400" />
            Invite Team Member
          </CardTitle>
          <CardDescription>
            Send an invitation link to a new team member.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={inviteTeamMember} className="flex flex-col sm:flex-row items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="email" className="text-xs text-muted-foreground">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="colleague@example.com"
                required
                className="glass border-white/10 h-9"
              />
            </div>
            <div className="w-48 space-y-1.5">
              <Label htmlFor="role" className="text-xs text-muted-foreground">Role</Label>
              <select
                id="role"
                name="role"
                required
                className="flex h-9 w-full rounded-md border border-white/10 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="STAFF" className="bg-background">Staff — Invoices Only</option>
                <option value="ADMIN" className="bg-background">Admin — Full Access</option>
              </select>
            </div>
            <Button type="submit" className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white shrink-0">
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              Send Invite
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Active Members Card ── */}
      <Card className="glass glass-card border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            Active Team Members
            <span className="ml-auto text-xs font-normal text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">
              {teamMembers.length} {teamMembers.length === 1 ? "member" : "members"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-white/8">
            {teamMembers.map((member) => {
              const roleConfig = ROLE_CONFIG[member.role] ?? { label: member.role, color: "" }
              const isCurrentUser = member.id === session.user.id
              const isOwner = member.role === "BUSINESS_OWNER"
              const canEdit = canManage && !isCurrentUser && !isOwner

              return (
                <div key={member.id} className="flex flex-col sm:flex-row sm:items-center gap-3 py-4">
                  {/* Avatar + info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/8 text-sm font-bold text-slate-300 uppercase">
                      {(member.name ?? member.email ?? "?")[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm flex items-center gap-2 flex-wrap">
                        {member.name || "Unknown"}
                        {isCurrentUser && (
                          <span className="text-[10px] font-normal text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">You</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                  </div>

                  {/* Role badge + actions */}
                  <div className="flex items-center gap-2 ml-12 sm:ml-0">
                    {/* Inline role update form */}
                    {canEdit ? (
                      <form action={updateTeamMemberRole} className="flex items-center gap-2">
                        <input type="hidden" name="userId" value={member.id} />
                        <select
                          name="role"
                          defaultValue={member.role}
                          className="h-8 rounded-md border border-white/10 bg-transparent px-2 py-0 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-w-[130px]"
                        >
                          <option value="STAFF" className="bg-background">Staff — Invoices Only</option>
                          <option value="ADMIN" className="bg-background">Admin — Full Access</option>
                        </select>
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs border-white/10 hover:bg-white/8 hover:border-indigo-500/40 text-indigo-400"
                        >
                          Update
                        </Button>
                      </form>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleConfig.color}`}>
                        {roleConfig.label}
                      </span>
                    )}

                    {/* Remove button */}
                    {canEdit && (
                      <form action={removeTeamMember}>
                        <input type="hidden" name="userId" value={member.id} />
                        <Button
                          variant="destructive"
                          size="sm"
                          type="submit"
                          className="h-8 text-xs bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20"
                        >
                          Remove
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Pending Invitations Card ── */}
      <Card className="glass glass-card border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-amber-400" />
            Pending Invitations
            {invitations.length > 0 && (
              <span className="ml-auto text-xs font-normal text-muted-foreground bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                {invitations.length} pending
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending invitations.</p>
          ) : (
            <div className="divide-y divide-white/8">
              {invitations.map((inv) => {
                const isExpired = new Date(inv.expiresAt) < new Date()
                return (
                  <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center gap-3 py-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
                        <Mail className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{inv.email}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />
                          {isExpired ? (
                            <span className="text-rose-400">Expired {new Date(inv.expiresAt).toLocaleDateString()}</span>
                          ) : (
                            <>Expires {new Date(inv.expiresAt).toLocaleDateString()}</>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-11 sm:ml-0">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${ROLE_CONFIG[inv.role]?.color ?? ""}`}>
                        {ROLE_CONFIG[inv.role]?.label ?? inv.role}
                      </span>
                      {canManage && (
                        <form action={cancelInvitation}>
                          <input type="hidden" name="invId" value={inv.id} />
                          <Button
                            variant="ghost"
                            size="sm"
                            type="submit"
                            className="h-7 text-xs text-rose-400 hover:bg-rose-500/10"
                          >
                            Cancel
                          </Button>
                        </form>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
