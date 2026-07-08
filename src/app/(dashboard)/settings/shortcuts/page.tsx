import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { KeyboardShortcutsForm } from "@/components/forms/keyboard-shortcuts-form"

export default async function KeyboardShortcutsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { dashboardConfig: true }
  })

  const config = (user?.dashboardConfig as any) || {}
  const initialShortcuts = config.keyboardShortcuts || {}

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <KeyboardShortcutsForm initialShortcuts={initialShortcuts} />
    </div>
  )
}
