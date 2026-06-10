import { execSync } from "child_process"
import { existsSync, readFileSync, writeFileSync } from "fs"
import path from "path"
import {
  ROOT,
  CONFIG_PATH,
  getDatabaseConfig,
  getDatabaseUrl,
  saveDatabaseConfig,
} from "./database-config.mjs"

const args = process.argv.slice(2)
const providerArg = args.find((a) => a.startsWith("--provider="))?.split("=")[1]

if (providerArg === "sqlite" || providerArg === "postgresql") {
  const existing = getDatabaseConfig()
  saveDatabaseConfig({
    provider: providerArg,
    postgresqlUrl: existing.postgresqlUrl,
  })
}

const config = getDatabaseConfig()
const databaseUrl = getDatabaseUrl(config)
const schemaPath = path.join(ROOT, "prisma", "schema.prisma")

let schema = readFileSync(schemaPath, "utf-8")
const datasource =
  config.provider === "sqlite"
    ? 'datasource db {\n  provider = "sqlite"\n  url      = env("DATABASE_URL")\n}'
    : 'datasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}'

schema = schema.replace(/datasource db \{[^}]+\}/s, datasource)
writeFileSync(schemaPath, schema)

console.log(`Database provider: ${config.provider}`)
console.log(`Database URL: ${databaseUrl}`)

execSync("npx prisma generate", {
  cwd: ROOT,
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: databaseUrl },
})

try {
  execSync("npx prisma db push", {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  })
} catch {
  console.warn("db push skipped or failed — run manually if needed")
}

if (!existsSync(CONFIG_PATH)) {
  saveDatabaseConfig(config)
}
