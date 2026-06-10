import "dotenv/config"
import { defineConfig } from "prisma/config"
import { existsSync, mkdirSync, readFileSync } from "fs"
import path from "path"

function getDatabaseUrl(): string {
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

    return config.postgresqlUrl || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || ""
  }

  if (process.env.DATABASE_PROVIDER === "sqlite") {
    const dataDir = path.join(process.cwd(), "data")
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
    return `file:${path.join(dataDir, "invoice.db")}`
  }

  return process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || ""
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
