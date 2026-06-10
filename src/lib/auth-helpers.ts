import { auth } from "@/auth"
import { Role } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export async function requireAuth() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }
  return session
}

export async function requireCompany() {
  const session = await requireAuth()
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { company: true },
  })

  if (!user?.companyId || !user.company) {
    throw new Error("Company setup required")
  }

  return { session, user, company: user.company }
}

export function hasRole(userRole: Role, allowed: Role[]): boolean {
  return allowed.includes(userRole)
}

export const ROLE_PERMISSIONS = {
  manageUsers: [Role.ADMIN, Role.BUSINESS_OWNER] as Role[],
  manageInvoices: [Role.ADMIN, Role.BUSINESS_OWNER, Role.STAFF] as Role[],
  viewReports: [Role.ADMIN, Role.BUSINESS_OWNER, Role.STAFF] as Role[],
  manageSettings: [Role.ADMIN, Role.BUSINESS_OWNER] as Role[],
}
