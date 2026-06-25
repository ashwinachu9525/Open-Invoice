import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { InviteOnboardingForm } from "@/components/auth/invite-onboarding-form"
import { FileText, LogOut } from "lucide-react"
import Link from "next/link"

async function acceptInvitation(formData: FormData) {
  "use server"
  const session = await auth()
  const token = formData.get("token") as string
  if (!token) throw new Error("Token missing")

  const invitation = await prisma.teamInvitation.findUnique({
    where: { token },
    include: { company: true }
  })

  if (!invitation || invitation.expiresAt < new Date()) {
    throw new Error("Invalid or expired invitation")
  }

  if (!session?.user?.id || session.user.email !== invitation.email) {
    throw new Error("Unauthorized")
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
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl glass border-red-500/20 text-center">
          <CardHeader>
            <CardTitle className="text-xl text-red-400">Invalid Invitation</CardTitle>
            <CardDescription>The invitation link is invalid or missing a token.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const invitation = await prisma.teamInvitation.findUnique({
    where: { token },
    include: { company: true }
  })

  if (!invitation || invitation.expiresAt < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl glass border-red-500/20 text-center">
          <CardHeader>
            <CardTitle className="text-xl text-red-400">Invitation Expired</CardTitle>
            <CardDescription>This team invitation has expired or could not be found.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Check if a user with this email already exists in the database
  const existingUser = await prisma.user.findUnique({
    where: { email: invitation.email }
  })

  const session = await auth()

  // Case 1: User already has an account
  if (existingUser) {
    // Sub-case A: Logged in with the correct email
    if (session?.user?.email === invitation.email) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
          <Card className="w-full max-w-md shadow-2xl glass border-white/10">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-2">
                <FileText className="h-10 w-10 text-indigo-500" />
              </div>
              <CardTitle className="text-2xl">Join {invitation.company.name}</CardTitle>
              <CardDescription>
                You are logged in as <b>{session.user.email}</b>. You have been invited to join this company as a <b>{invitation.role}</b>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={acceptInvitation} className="flex flex-col gap-4">
                <input type="hidden" name="token" value={token} />
                <Button type="submit" className="w-full text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                  Accept Invitation
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )
    }

    // Sub-case B: Logged in with a DIFFERENT email
    if (session?.user) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
          <Card className="w-full max-w-md shadow-2xl glass border-white/10 text-center">
            <CardHeader>
              <CardTitle className="text-xl text-amber-400">Account Mismatch</CardTitle>
              <CardDescription className="text-slate-300">
                You are logged in as <b>{session.user.email}</b>, but this invitation was sent to <b>{invitation.email}</b>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground leading-normal">
                Please log out of your current account, then sign in as {invitation.email} to accept this invitation.
              </p>
              <div className="flex gap-3">
                <Link href="/login" className="flex-1">
                  <Button variant="outline" className="w-full glass border-white/10 hover:bg-white/5">
                    Sign In Options
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    // Sub-case C: Not logged in — redirect to login with callback URL
    redirect(`/login?email=${encodeURIComponent(invitation.email)}&callbackUrl=${encodeURIComponent(`/invite?token=${token}`)}`)
  }

  // Case 2: User does NOT have an account — show Name, Password onboarding + OTP Verification
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <Card className="w-full max-w-md shadow-2xl glass border-white/10">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-2">
            <FileText className="h-10 w-10 text-indigo-500" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Join {invitation.company.name}</CardTitle>
          <CardDescription>
            Complete your profile to accept the team invitation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteOnboardingForm
            token={token}
            email={invitation.email}
            companyName={invitation.company.name}
            role={invitation.role}
          />
        </CardContent>
      </Card>
    </div>
  )
}
