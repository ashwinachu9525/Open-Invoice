"use server"

import { getDatabaseDisplayInfo } from "@/lib/database-config"
import type { DatabaseProvider } from "@/types/database"
import { auth } from "@/auth"
import { Role } from "@prisma/client"

export async function getDatabaseSettings() {
  return getDatabaseDisplayInfo()
}

export async function updateDatabaseProvider(_data: {
  provider: DatabaseProvider
  postgresqlUrl?: string
}): Promise<{ success?: boolean; message?: string; error?: string; requiresRestart?: boolean }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  if (session.user.role !== Role.ADMIN && session.user.role !== Role.BUSINESS_OWNER) {
    return { error: "Only admins can change database settings" }
  }

  return {
    error: "Database configuration is managed exclusively via the .env file. Please configure DATABASE_PROVIDER and DATABASE_URL in your .env file.",
  }
}
