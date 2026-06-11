import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

async function acceptInvitation(formData: FormData) {
  "use server"
  const session = await auth()
  if (!session?.user?.id) redirect("/login?callbackUrl=" + encodeURIComponent(formData.get("callbackUrl") as string))

  const token = formData.get("token") as string
  if (!token) throw new Error("Token missing")

  const invitation = await prisma.teamInvitation.findUnique({
    where: { token },
    include: { company: true }
  })

  if (!invitation || invitation.expiresAt < new Date()) {
    throw new Error("Invalid or expired invitation")
  }

  // Update user with new company and role
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      companyId: invitation.companyId,
      role: invitation.role
    }
  })

  // Delete invitation
  await prisma.teamInvitation.delete({ where: { id: invitation.id } })

  redirect("/dashboard")
}

export default async function InvitePage(props: {
  searchParams: Promise<{ token?: string }>
}) {
  const { searchParams } = props
  const { token } = await searchParams

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <h1 className="text-2xl font-bold">Invalid Invitation Link</h1>
      </div>
    )
  }

  const invitation = await prisma.teamInvitation.findUnique({
    where: { token },
    include: { company: true }
  })

  if (!invitation || invitation.expiresAt < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <h1 className="text-2xl font-bold text-red-500">Invitation expired or not found.</h1>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <Card className="w-full max-w-md shadow-2xl glass">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Join {invitation.company.name}</CardTitle>
          <CardDescription>
            You have been invited to join this company as <b>{invitation.role}</b>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={acceptInvitation} className="flex flex-col gap-4">
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="callbackUrl" value={`/invite?token=${token}`} />
            <Button type="submit" className="w-full text-lg bg-gradient-to-r from-violet-500 to-indigo-600 text-white hover:from-violet-600 hover:to-indigo-700">
              Accept Invitation
            </Button>
          </form>
          <p className="text-xs text-center text-muted-foreground mt-4">
            If you do not have an account, you will be asked to sign in or create one first.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
