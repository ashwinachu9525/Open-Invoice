"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { executeAdminSqlQuery, executeSqlScript } from "@/actions/admin-tools"
import { Database, Play, Loader2, Key, Terminal, AlertCircle, Upload } from "lucide-react"
import { toast } from "sonner"

export default function SqlConsolePage() {
  const [password, setPassword] = useState("")
  const [query, setQuery] = useState("SELECT * FROM \"User\" LIMIT 5;")
  const [isDml, setIsDml] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    columns?: string[]
    rows?: any[]
    error?: string
  } | null>(null)

  // SQL Script state
  const [sqlFile, setSqlFile] = useState<File | null>(null)
  const [sqlContent, setSqlContent] = useState("")
  const [executingScript, setExecutingScript] = useState(false)

  function handleSqlFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSqlFile(file)
    const reader = new FileReader()
    reader.onload = (event) => {
      setSqlContent(event.target?.result as string)
      toast.success(`Loaded SQL script: ${file.name}`)
    }
    reader.readAsText(file)
  }

  async function handleExecuteScript() {
    if (!password) {
      toast.error("Please enter the SQL Admin password.")
      return
    }
    if (!sqlContent.trim()) {
      toast.error("SQL script is empty.")
      return
    }
    setExecutingScript(true)
    setResult(null)
    try {
      const res = await executeSqlScript(sqlContent, password)
      if (res.success) {
        toast.success(res.message || "SQL script executed successfully.")
        setSqlFile(null)
        setSqlContent("")
      } else {
        toast.error(res.message || "Failed to execute SQL script.")
        if (res.error) {
          setResult({
            success: false,
            error: res.error
          })
        }
      }
    } catch (err: any) {
      setResult({ success: false, error: err.message || "Script execution failed." })
      toast.error("Script execution failed.")
    } finally {
      setExecutingScript(false)
    }
  }

  const queryTemplates = [
    { label: "Users Limit 5", sql: 'SELECT id, name, email, role, "companyId", "createdAt" FROM "User" LIMIT 5;' },
    { label: "Companies Limit 5", sql: 'SELECT id, name, "subscriptionTier", "createdAt" FROM "Company" LIMIT 5;' },
    { label: "Active Pro Users", sql: 'SELECT id, name, email, "isPro", "proExpiry" FROM "User" WHERE "isPro" = true;' },
    { label: "Pending Pro Upgrade Requests", sql: 'SELECT id, name, "subscriptionTier", "proRequestStatus" FROM "Company" WHERE "proRequestStatus" = \'PENDING\';' },
    { label: "Audit Logs (Last 10)", sql: 'SELECT id, action, entity, "entityId", "createdAt" FROM "AuditLog" ORDER BY "createdAt" DESC LIMIT 10;' }
  ]

  async function handleExecute(e: React.FormEvent) {
    e.preventDefault()
    if (!password) {
      toast.error("Please enter the SQL Admin Secret password.")
      return
    }
    if (!query.trim()) {
      toast.error("Query cannot be empty.")
      return
    }

    setExecuting(true)
    setResult(null)

    try {
      const res = await executeAdminSqlQuery(query, password, isDml)
      setResult(res)
      if (res.success) {
        toast.success("Query executed successfully.")
      } else {
        toast.error(res.error || "Query failed to execute.")
      }
    } catch (err: any) {
      setResult({ success: false, error: err.message || "An unexpected error occurred." })
      toast.error("An unexpected error occurred.")
    } finally {
      setExecuting(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">SQL Query Console</h1>
        <p className="text-gray-500">Run raw read and write SQL statements directly against the database.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Controls Card */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-500" />
                Security Credentials
              </CardTitle>
              <CardDescription>
                Authorized access only. Enter the secure SQL execution password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="sql-password">SQL Secret Password</Label>
                <Input
                  id="sql-password"
                  type="password"
                  placeholder="Enter secret password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-indigo-500" />
                Query Presets
              </CardTitle>
              <CardDescription>
                Quickly load standard diagnostic templates into the editor.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {queryTemplates.map((template, idx) => (
                <Button
                  key={idx}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuery(template.sql)}
                  className="w-full text-left justify-start text-xs border-slate-800 hover:bg-slate-800 text-slate-300 font-mono truncate"
                >
                  {template.label}
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* SQL Script Importer Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-500" />
                SQL Backup Script Runner
              </CardTitle>
              <CardDescription>
                Upload and run raw `.sql` migration or seed dumps.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border border-dashed border-slate-800 rounded-xl p-4 bg-slate-950/40 text-center hover:bg-slate-950/60 transition duration-200 relative">
                <input
                  type="file"
                  accept=".sql"
                  onChange={handleSqlFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Database className="w-6 h-6 text-indigo-400 mx-auto mb-1.5" />
                <p className="text-[11px] text-slate-300 font-medium truncate max-w-[180px] mx-auto">
                  {sqlFile ? sqlFile.name : "Select .sql script file"}
                </p>
              </div>

              {sqlContent && (
                <Button
                  onClick={handleExecuteScript}
                  disabled={executingScript || !password}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                >
                  {executingScript ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Running Script...
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 mr-1.5 fill-current" /> Execute SQL Script
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Editor & Results Card */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-500" />
                  SQL Editor
                </CardTitle>
                <CardDescription>Write PostgreSQL compatible queries.</CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-slate-300 font-medium cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isDml}
                    onChange={(e) => setIsDml(e.target.checked)}
                    className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  DML Mode (INSERT/UPDATE/DELETE)
                </label>
                <Button 
                  type="button"
                  onClick={handleExecute} 
                  disabled={executing || !password}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                >
                  {executing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )}
                  Run Query
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-2 focus-within:ring-2 focus-within:ring-indigo-500/50">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="SELECT * FROM table_name;"
                  className="w-full min-h-[160px] bg-transparent text-slate-100 font-mono text-sm border-0 focus:outline-none focus:ring-0 resize-y"
                  style={{ whiteSpace: "pre", overflowWrap: "normal" }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Results Display */}
          {result && (
            <Card>
              <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="text-base font-semibold">
                  Execution Output
                </CardTitle>
                <CardDescription>
                  {result.success ? (
                    <span className="text-emerald-500 font-medium">
                      Success: {result.rows?.length || 0} rows returned
                    </span>
                  ) : (
                    <span className="text-rose-500 font-medium">Failed</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {!result.success ? (
                  <div className="flex items-start gap-3 p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400">
                    <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-semibold">Query Error</h4>
                      <pre className="text-xs font-mono mt-1 whitespace-pre-wrap">{result.error}</pre>
                    </div>
                  </div>
                ) : result.rows && result.rows.length > 0 ? (
                  <div className="overflow-x-auto border border-slate-800 rounded-xl">
                    <table className="w-full text-xs text-left font-mono">
                      <thead className="text-[10px] text-muted-foreground uppercase bg-slate-900 border-b border-slate-800">
                        <tr>
                          {result.columns?.map((col) => (
                            <th key={col} className="px-4 py-3 font-semibold text-slate-300">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 bg-slate-950/50">
                        {result.rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/30">
                            {result.columns?.map((col) => {
                              const cellVal = row[col]
                              let displayVal = ""
                              if (cellVal === null) {
                                displayVal = "NULL"
                              } else if (typeof cellVal === "object") {
                                displayVal = JSON.stringify(cellVal)
                              } else {
                                displayVal = String(cellVal)
                              }
                              return (
                                <td key={col} className={`px-4 py-2 max-w-xs truncate ${cellVal === null ? "text-slate-600 italic" : "text-slate-300"}`}>
                                  {displayVal}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Query executed successfully but returned 0 rows.
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
