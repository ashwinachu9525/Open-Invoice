"use client"

import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateSystemConfig, exportDatabaseBackup } from "@/actions/admin-tools"
import { toast } from "sonner"
import { Loader2, Cpu, HardDrive, ShieldAlert, CheckCircle, RefreshCcw, Lock } from "lucide-react"

interface SystemDiagnosticsPanelProps {
  initialConfig: {
    maintenanceMode: boolean
    registrationOpen: boolean
    systemLogLevel: string
    requireEmailVerification: boolean
  }
  diagnostics: {
    stats: {
      users: number
      companies: number
      invoices: number
      quotations: number
      payments: number
      auditLogs: number
      appErrors: number
      emailLogs: number
    }
    diagnostics: {
      nodeVersion: string
      platform: string
      arch: string
      uptimeSeconds: number
      totalMemoryMB: number
      usedMemoryMB: number
      cpuCores: number
      loadAverage: number[]
    }
  }
}

export function SystemDiagnosticsPanel({ initialConfig, diagnostics }: SystemDiagnosticsPanelProps) {
  const [config, setConfig] = useState(initialConfig)
  const [password, setPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [backingUp, setBackingUp] = useState(false)

  async function handleBackupDownload() {
    if (!password) {
      toast.error("Please enter the SQL Admin password.")
      return
    }
    setBackingUp(true)
    try {
      const res = await exportDatabaseBackup(password)
      if (res.success && res.backup) {
        const blob = new Blob([res.backup], { type: "application/json" })
        const urlObj = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = urlObj
        a.download = `open_invoice_backup_${new Date().toISOString().slice(0, 10)}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(urlObj)
        toast.success("Backup downloaded successfully!")
      } else {
        toast.error(res.error || "Failed to generate backup.")
      }
    } catch {
      toast.error("An error occurred during backup generation.")
    } finally {
      setBackingUp(false)
    }
  }

  // Format uptime seconds into human-readable string
  function formatUptime(seconds: number) {
    const days = Math.floor(seconds / (3600 * 24))
    const hours = Math.floor((seconds % (3600 * 24)) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    const parts = []
    if (days > 0) parts.push(`${days}d`)
    if (hours > 0) parts.push(`${hours}h`)
    parts.push(`${minutes}m`)
    return parts.join(" ")
  }

  const memoryUsagePercent = Math.round(
    (diagnostics.diagnostics.usedMemoryMB / diagnostics.diagnostics.totalMemoryMB) * 100
  )

  async function handleSaveConfig() {
    if (!password) {
      toast.error("Please enter the SQL Admin password.")
      return
    }
    setSaving(true)
    try {
      const res = await updateSystemConfig(config, password)
      if (res.success) {
        toast.success(res.message || "System configuration saved.")
        setPassword("")
      } else {
        toast.error(res.error || "Failed to save configuration.")
      }
    } catch {
      toast.error("An error occurred.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* ── System Configuration ── */}
      <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-100 flex items-center gap-2">
            System Control Switches
          </CardTitle>
          <CardDescription className="text-slate-400">
            Override global parameters. Changes require SQL Admin password validation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-850 pb-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold text-slate-200">System Maintenance Mode</Label>
              <p className="text-xs text-muted-foreground">
                Activate to block tenant portals and display maintenance overlay.
              </p>
            </div>
            <input
              type="checkbox"
              checked={config.maintenanceMode}
              onChange={(e) => setConfig((prev) => ({ ...prev, maintenanceMode: e.target.checked }))}
              className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500 w-9 h-5 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between border-b border-slate-850 pb-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold text-slate-200">Open Registration</Label>
              <p className="text-xs text-muted-foreground">
                Allow new users to sign up and register companies.
              </p>
            </div>
            <input
              type="checkbox"
              checked={config.registrationOpen}
              onChange={(e) => setConfig((prev) => ({ ...prev, registrationOpen: e.target.checked }))}
              className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500 w-9 h-5 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between border-b border-slate-850 pb-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold text-slate-200">Require Email Verification</Label>
              <p className="text-xs text-muted-foreground">
                Force email verification link validation before granting access.
              </p>
            </div>
            <input
              type="checkbox"
              checked={config.requireEmailVerification}
              onChange={(e) => setConfig((prev) => ({ ...prev, requireEmailVerification: e.target.checked }))}
              className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500 w-9 h-5 cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-200 font-semibold">Logging Level</Label>
            <Select
              value={config.systemLogLevel}
              onValueChange={(val) => val && setConfig((prev) => ({ ...prev, systemLogLevel: val }))}
            >
              <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-100">
                <SelectValue placeholder="Select logging level" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                <SelectItem value="info">INFO</SelectItem>
                <SelectItem value="debug">DEBUG</SelectItem>
                <SelectItem value="warn">WARN</SelectItem>
                <SelectItem value="error">ERROR</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 border-t border-slate-850 pt-4">
            <Label htmlFor="sys-password" className="text-slate-300 font-medium flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-500" /> Admin SQL Password Required
            </Label>
            <Input
              id="sys-password"
              type="password"
              placeholder="Enter SQL admin password to save changes..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-slate-950 border-slate-800 text-slate-100 focus-visible:ring-indigo-500/50"
            />
          </div>

          <Button
            onClick={handleSaveConfig}
            disabled={saving || !password}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-slate-100 font-semibold"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving Configuration...
              </>
            ) : (
              "Save System Configuration"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ── System Telemetry & Metrics ── */}
      <div className="space-y-6">
        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-emerald-400" /> System Diagnostics
            </CardTitle>
            <CardDescription className="text-slate-400">
              Live server node parameters and environment architecture.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl">
                <div className="text-xs text-muted-foreground font-medium">Node Version</div>
                <div className="text-sm font-bold text-slate-200 mt-0.5">{diagnostics.diagnostics.nodeVersion}</div>
              </div>
              <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl">
                <div className="text-xs text-muted-foreground font-medium">Uptime</div>
                <div className="text-sm font-bold text-slate-200 mt-0.5">{formatUptime(diagnostics.diagnostics.uptimeSeconds)}</div>
              </div>
              <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl">
                <div className="text-xs text-muted-foreground font-medium">Platform / Arch</div>
                <div className="text-sm font-bold text-slate-200 mt-0.5 uppercase">
                  {diagnostics.diagnostics.platform} ({diagnostics.diagnostics.arch})
                </div>
              </div>
              <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl">
                <div className="text-xs text-muted-foreground font-medium">CPU Cores</div>
                <div className="text-sm font-bold text-slate-200 mt-0.5">{diagnostics.diagnostics.cpuCores} Cores</div>
              </div>
            </div>

            {/* Memory Usage Bar */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-300">RAM Memory Allocation</span>
                <span className="text-slate-200">
                  {diagnostics.diagnostics.usedMemoryMB}MB / {diagnostics.diagnostics.totalMemoryMB}MB ({memoryUsagePercent}%)
                </span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    memoryUsagePercent > 80 ? "bg-rose-500" : memoryUsagePercent > 60 ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${memoryUsagePercent}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database Metric Counts */}
        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-indigo-400" /> Database Telemetry
            </CardTitle>
            <CardDescription className="text-slate-400">
              Total table row counts currently persisted in PostgreSQL database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex justify-between border-b border-slate-850 py-1.5 px-1">
                <span className="text-slate-400 font-medium">Users Table</span>
                <span className="font-mono text-slate-200 font-semibold">{diagnostics.stats.users}</span>
              </div>
              <div className="flex justify-between border-b border-slate-850 py-1.5 px-1">
                <span className="text-slate-400 font-medium">Companies Table</span>
                <span className="font-mono text-slate-200 font-semibold">{diagnostics.stats.companies}</span>
              </div>
              <div className="flex justify-between border-b border-slate-850 py-1.5 px-1">
                <span className="text-slate-400 font-medium">Invoices Table</span>
                <span className="font-mono text-slate-200 font-semibold">{diagnostics.stats.invoices}</span>
              </div>
              <div className="flex justify-between border-b border-slate-850 py-1.5 px-1">
                <span className="text-slate-400 font-medium">Quotations Table</span>
                <span className="font-mono text-slate-200 font-semibold">{diagnostics.stats.quotations}</span>
              </div>
              <div className="flex justify-between border-b border-slate-850 py-1.5 px-1">
                <span className="text-slate-400 font-medium">Payments Table</span>
                <span className="font-mono text-slate-200 font-semibold">{diagnostics.stats.payments}</span>
              </div>
              <div className="flex justify-between border-b border-slate-850 py-1.5 px-1">
                <span className="text-slate-400 font-medium">Audit Logs Table</span>
                <span className="font-mono text-slate-200 font-semibold">{diagnostics.stats.auditLogs}</span>
              </div>
              <div className="flex justify-between border-b border-slate-850 py-1.5 px-1">
                <span className="text-slate-400 font-medium">App Errors Table</span>
                <span className="font-mono text-slate-200 font-semibold">{diagnostics.stats.appErrors}</span>
              </div>
              <div className="flex justify-between border-b border-slate-850 py-1.5 px-1">
                <span className="text-slate-400 font-medium">Email Logs Table</span>
                <span className="font-mono text-slate-200 font-semibold">{diagnostics.stats.emailLogs}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-400" /> Database Backup & Export
            </CardTitle>
            <CardDescription className="text-slate-400">
              Download a complete JSON backup of all tables. Requires SQL Admin Password verification.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleBackupDownload}
              disabled={backingUp || !password}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold"
            >
              {backingUp ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating Backup...
                </>
              ) : (
                "Export Database as JSON"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
