"use server"

import { execSync } from "child_process"
import path from "path"
import {
  getDatabaseConfig,
  getDatabaseDisplayInfo,
  saveDatabaseConfig,
} from "@/lib/database-config"
import type { DatabaseProvider } from "@/types/database"
import { auth } from "@/auth"
import { Role } from "@prisma/client"

export async function getDatabaseSettings() {
  return getDatabaseDisplayInfo()
}

export async function updateDatabaseProvider(data: {
  provider: DatabaseProvider
  postgresqlUrl?: string
}) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  if (session.user.role !== Role.ADMIN && session.user.role !== Role.BUSINESS_OWNER) {
    return { error: "Only admins can change database settings" }
  }

  if (data.provider === "postgresql" && !data.postgresqlUrl?.trim()) {
    const existing = getDatabaseConfig()
    if (!existing.postgresqlUrl && !process.env.DATABASE_URL) {
      return { error: "PostgreSQL connection URL is required" }
    }
  }

  saveDatabaseConfig({
    provider: data.provider,
    postgresqlUrl: data.postgresqlUrl?.trim() || getDatabaseConfig().postgresqlUrl,
  })

  try {
    execSync("node scripts/configure-database.mjs", {
      cwd: path.join(process.cwd()),
      stdio: "pipe",
      env: { ...process.env },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Configuration failed"
    return {
      error: `Saved preference but schema sync failed: ${message}. Run: npm run db:configure`,
    }
  }

  return {
    success: true,
    message:
      data.provider === "sqlite"
        ? "SQLite enabled. Database stored at data/invoice.db. Restart the dev server."
        : "PostgreSQL enabled. Restart the dev server to apply changes.",
    requiresRestart: true,
  }
}
