import dotenv from "dotenv"
import { existsSync, mkdirSync } from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const ROOT = path.join(__dirname, "..")
export const DATA_DIR = path.join(ROOT, "data")
export const SQLITE_DB_PATH = path.join(DATA_DIR, "invoice.db")

// Strictly load configuration only from .env
dotenv.config({ path: path.join(ROOT, ".env") })

/** @typedef {'sqlite' | 'postgresql'} DatabaseProvider */

/**
 * @returns {{ provider: DatabaseProvider, postgresqlUrl?: string }}
 */
export function getDatabaseConfig() {
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
 * No-op: Configuration is read exclusively from .env to avoid exposing credentials.
 * @param {{ provider: DatabaseProvider, postgresqlUrl?: string }} _config
 */
export function saveDatabaseConfig(_config) {
  // Do not write database credentials to any file on disk.
}

export function getDatabaseUrl(config = getDatabaseConfig()) {
  if (config.provider === "sqlite") {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true })
    }
    return `file:${SQLITE_DB_PATH}`
  }

  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    ""

  return url
}

export function getActiveProvider(config = getDatabaseConfig()) {
  return config.provider
}
