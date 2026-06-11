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

async function inviteTeamMember(formData: FormData) {
  "use server"
  const { session, company } = await requireCompany()
  if (session.user.role !== "BUSINESS_OWNER" && session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
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
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }
  })

  // In a real app, send an email here with `${process.env.NEXT_PUBLIC_APP_URL}/invite?token=${token}`
  console.log(`[Invite Generated] Token: ${token}`)

  revalidatePath("/settings/team")
}

async function removeTeamMember(formData: FormData) {
  "use server"
  const { session, company } = await requireCompany()
  if (session.user.role !== "BUSINESS_OWNER" && session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
    throw new Error("Unauthorized to remove team members")
  }

  const userId = formData.get("userId") as string
  if (userId === session.user.id) throw new Error("Cannot remove yourself")

  await prisma.user.update({
    where: { id: userId, companyId: company.id },
    data: { companyId: null }
  })

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
    prisma.user.findMany({ where: { companyId: company.id } }),
    prisma.teamInvitation.findMany({ where: { companyId: company.id } })
  ])

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
        <p className="text-gray-500">Invite users and manage roles for {company.name}.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invite Team Member</CardTitle>
          <CardDescription>
            Send an invitation link to a new team member. (Currently logs link to console).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={inviteTeamMember} className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="colleague@example.com" required className="glass border-white/10" />
            </div>
            <div className="w-48 space-y-2">
              <Label htmlFor="role">Role</Label>
              <select id="role" name="role" required className="flex h-9 w-full rounded-md border border-white/10 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="STAFF" className="bg-background">Staff (Invoices Only)</option>
                <option value="ADMIN" className="bg-background">Admin (Full Access)</option>
              </select>
            </div>
            <Button type="submit">Invite</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending invitations.</p>
          ) : (
            <div className="divide-y divide-white/10">
              {invitations.map(inv => (
                <div key={inv.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">Role: {inv.role}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Expires: {inv.expiresAt.toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-white/10">
            {teamMembers.map(member => (
              <div key={member.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{member.name || "Unknown"} <span className="text-xs text-muted-foreground ml-2">({member.email})</span></p>
                  <p className="text-xs font-mono mt-1 text-primary">{member.role}</p>
                </div>
                {member.id !== session.user.id && member.role !== "BUSINESS_OWNER" && (
                  <form action={removeTeamMember}>
                    <input type="hidden" name="userId" value={member.id} />
                    <Button variant="destructive" size="sm" type="submit">Remove</Button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
