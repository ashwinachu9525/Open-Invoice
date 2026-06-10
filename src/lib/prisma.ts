import "server-only"
import { PrismaClient } from "@prisma/client"
import { existsSync, mkdirSync } from "fs"
import path from "path"
import { getActiveProvider, getDatabaseUrl, SQLITE_DB_PATH } from "@/lib/database-config"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaProvider: string | undefined
}

function createSqliteClient(log: ("error" | "warn")[]): PrismaClient {
  const dataDir = path.dirname(SQLITE_DB_PATH)
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }

  // Lazy require avoids Turbopack bundling native better-sqlite3
  const { PrismaLibSql } = require("@prisma/adapter-libsql") as typeof import("@prisma/adapter-libsql")
  const adapter = new PrismaLibSql({ url: `file:${SQLITE_DB_PATH}` })
  return new PrismaClient({ adapter, log })
}

function createPostgresClient(log: ("error" | "warn")[]): PrismaClient {
  // Use Prisma's native Rust engine — it handles SSL (Aiven, Supabase, Neon, etc.)
  // automatically without any driver-level SSL hacks. DATABASE_URL is read from env.
  return new PrismaClient({ log })
}

function createPrismaClient(): PrismaClient {
  const provider = getActiveProvider()
  const log: ("error" | "warn")[] =
    process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]

  if (provider === "sqlite") {
    return createSqliteClient(log)
  }

  return createPostgresClient(log)
}

const currentProvider = getActiveProvider()

if (
  globalForPrisma.prisma &&
  globalForPrisma.prismaProvider &&
  globalForPrisma.prismaProvider !== currentProvider
) {
  globalForPrisma.prisma = undefined
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
  globalForPrisma.prismaProvider = currentProvider
}
