import "server-only"
import { existsSync, mkdirSync } from "fs"
import path from "path"
import type { DatabaseConfig, DatabaseProvider } from "@/types/database"

export type { DatabaseConfig, DatabaseProvider } from "@/types/database"

const DATA_DIR = path.join(process.cwd(), "data")
export const SQLITE_DB_PATH = path.join(DATA_DIR, "invoice.db")

/**
 * Resolves database configuration exclusively from environment variables (.env).
 * Does not read or write to any JSON or auxiliary files.
 */
export function getDatabaseConfig(): DatabaseConfig {
  const envProvider = process.env.DATABASE_PROVIDER
  if (envProvider === "postgresql" || envProvider === "sqlite") {
    return {
      provider: envProvider,
      postgresqlUrl: process.env.DATABASE_URL,
    }
  }

  if (
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL?.startsWith("postgres")
  ) {
    return {
      provider: "postgresql",
      postgresqlUrl: process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL,
    }
  }

  return { provider: "sqlite" }
}

/**
 * No-op: Configuration is read exclusively from .env to prevent exposing credentials in files.
 */
export function saveDatabaseConfig(_config: DatabaseConfig): void {
  // Do not write database credentials to any file on disk.
  // Database configuration is managed exclusively via .env
}

/**
 * Resolves the active database connection string exclusively from environment variables (.env).
 */
export function getDatabaseUrl(config: DatabaseConfig = getDatabaseConfig()): string {
  if (config.provider === "sqlite") {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true })
    }
    return `file:${SQLITE_DB_PATH}`
  }

  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    ""
  )
}

export function getActiveProvider(): DatabaseProvider {
  return getDatabaseConfig().provider
}

/**
 * Masks credentials in connection strings to prevent exposing passwords.
 */
export function maskDatabaseUrl(rawUrl: string): string {
  if (!rawUrl || rawUrl.startsWith("file:")) return rawUrl
  try {
    const parsed = new URL(rawUrl)
    if (parsed.password) {
      parsed.password = "******"
    }
    return parsed.toString()
  } catch {
    return rawUrl.replace(/:([^@/]+)@/, ":******@")
  }
}

export function getDatabaseDisplayInfo() {
  const config = getDatabaseConfig()
  const rawUrl = getDatabaseUrl(config)

  return {
    provider: config.provider,
    url: config.provider === "sqlite" ? "data/invoice.db (local package storage)" : maskDatabaseUrl(rawUrl),
    sqlitePath: SQLITE_DB_PATH,
    isSqlite: config.provider === "sqlite",
  }
}
