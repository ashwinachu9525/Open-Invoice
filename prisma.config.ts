import "dotenv/config"
import { defineConfig } from "prisma/config"
import { existsSync, mkdirSync, readFileSync } from "fs"
import path from "path"

function getDatabaseUrl(): string {
  if (process.env.DATABASE_PROVIDER === "sqlite") {
    const dataDir = path.join(process.cwd(), "data")
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
    return `file:${path.join(dataDir, "invoice.db")}`
  }

  if (process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL) {
    return process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL || ""
  }

  const configPath = path.join(process.cwd(), "data", "database.config.json")

  if (existsSync(configPath)) {
    const config = JSON.parse(readFileSync(configPath, "utf-8")) as {
      provider: string
      postgresqlUrl?: string
    }

    if (config.provider === "sqlite") {
      const dataDir = path.join(process.cwd(), "data")
      if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
      return `file:${path.join(dataDir, "invoice.db")}`
    }

    return config.postgresqlUrl || ""
  }

  return ""
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: getDatabaseUrl(),
  },
})
