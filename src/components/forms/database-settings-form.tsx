"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateDatabaseProvider } from "@/actions/database"
import type { DatabaseProvider } from "@/types/database"
import { Database, HardDrive } from "lucide-react"

interface DatabaseSettingsFormProps {
  currentProvider: DatabaseProvider
  currentUrl: string
  isSqlite: boolean
}

export function DatabaseSettingsForm({
  currentProvider,
  currentUrl,
  isSqlite,
}: DatabaseSettingsFormProps) {
  const [provider, setProvider] = useState<DatabaseProvider>(currentProvider)
  const [postgresqlUrl, setPostgresqlUrl] = useState(
    !isSqlite ? currentUrl : "postgresql://postgres:postgres@localhost:5432/invoice_saas"
  )
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsPending(true)
    setMessage("")
    setError("")

    const result = await updateDatabaseProvider({
      provider,
      postgresqlUrl: provider === "postgresql" ? postgresqlUrl : undefined,
    })

    setIsPending(false)

    if (result.error) {
      setError(result.error)
    } else {
      setMessage(result.message ?? "Database updated")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-600">{message}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setProvider("sqlite")}
          className={`flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all glass ${
            provider === "sqlite"
              ? "border-primary bg-primary/10"
              : "border-white/10 hover:bg-white/5"
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            <HardDrive className={`h-5 w-5 ${provider === "sqlite" ? "text-primary" : "text-muted-foreground"}`} />
            SQLite (Local)
          </div>
          <p className="text-sm text-muted-foreground">
            Store database inside the project at <code className="text-xs bg-white/10 px-1 py-0.5 rounded">data/invoice.db</code>.
            No external server needed. Best for local use and single-user setups.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setProvider("postgresql")}
          className={`flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all glass ${
            provider === "postgresql"
              ? "border-primary bg-primary/10"
              : "border-white/10 hover:bg-white/5"
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            <Database className={`h-5 w-5 ${provider === "postgresql" ? "text-primary" : "text-muted-foreground"}`} />
            PostgreSQL
          </div>
          <p className="text-sm text-muted-foreground">
            Connect to an external PostgreSQL server. Recommended for production,
            multi-user, and Vercel deployments.
          </p>
        </button>
      </div>

      {provider === "postgresql" && (
        <div className="glass glass-card border-white/10 p-4 rounded-xl">
          <Label htmlFor="postgresqlUrl" className="text-sm font-medium">PostgreSQL Connection URL</Label>
          <Input
            id="postgresqlUrl"
            value={postgresqlUrl}
            onChange={(e) => setPostgresqlUrl(e.target.value)}
            placeholder="postgresql://user:password@localhost:5432/invoice_saas"
            className="mt-2 font-mono text-sm glass border-white/10 focus:border-primary/50 focus:ring-primary/20"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Supports standard postgresql:// URLs and Prisma Postgres (prisma+postgres://)
          </p>
        </div>
      )}

      {provider === "sqlite" && (
        <div className="glass glass-card border-white/10 p-4 rounded-xl text-sm text-muted-foreground">
          <p>
            <strong>Storage location:</strong> <code className="text-xs bg-white/10 px-1 py-0.5 rounded">data/invoice.db</code> inside your project folder.
          </p>
          <p className="mt-1">The database file is gitignored and travels with your package.</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white">
          {isPending ? "Applying..." : "Save Database Settings"}
        </Button>
        <span className="text-sm text-muted-foreground">
          Current: <strong className="text-foreground capitalize">{currentProvider}</strong>
        </span>
      </div>

      <p className="text-xs text-amber-500/80 bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg">
        Changing database type requires a server restart. Data is not migrated automatically between
        SQLite and PostgreSQL.
      </p>
    </form>
  )
}
