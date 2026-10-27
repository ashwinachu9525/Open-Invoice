"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getDatabaseTableMetrics, purgeOldSystemLogs } from "@/actions/admin-tools"
import { toast } from "sonner"
import {
  Database,
  RefreshCw,
  Loader2,
  Trash2,
  AlertTriangle,
  Layers,
  HardDrive,
  ShieldAlert,
} from "lucide-react"

export function AdminTableFootprint() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<any | null>(null)

  // Log Purge State
  const [logType, setLogType] = useState<"app_errors" | "audit_logs" | "all">("app_errors")
  const [daysOld, setDaysOld] = useState<string>("30")
  const [password, setPassword] = useState("")
  const [purging, setPurging] = useState(false)
  const [purgeResult, setPurgeResult] = useState<any | null>(null)

  async function loadMetrics(isManual = false) {
    if (isManual) setRefreshing(true)
    try {
      const res = await getDatabaseTableMetrics()
      if (res.success) {
        setData(res)
        if (isManual) toast.success("Table metrics updated")
      } else {
        toast.error(res.error || "Failed to fetch table footprint")
      }
    } catch {
      toast.error("Error loading database metrics")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadMetrics()
  }, [])

  async function handlePurge(dryRun: boolean) {
    if (!password) {
      toast.error("Please enter the SQL Admin password.")
      return
    }

    setPurging(true)
    setPurgeResult(null)

    try {
      const res = await purgeOldSystemLogs(logType, Number(daysOld), dryRun, password)
      setPurgeResult(res)
      if (res.success) {
        toast.success(res.message)
        if (!dryRun) {
          loadMetrics()
          setPassword("")
        }
      } else {
        toast.error(res.error || "Purge operation failed.")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to purge logs")
    } finally {
      setPurging(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Table Storage Footprint Card */}
      <Card className="border-indigo-500/20 shadow-lg shadow-indigo-500/5">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="w-5 h-5 text-indigo-400" />
                Database Entities &amp; Table Storage Footprint
              </CardTitle>
              <CardDescription>
                Live count of stored records across all primary application models.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadMetrics(true)}
              disabled={refreshing || loading}
              className="gap-2 h-8 text-xs border-white/10 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh Counts
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
              Scanning database table volumes...
            </div>
          ) : !data || !data.tables ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Unable to retrieve table metrics.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {data.tables.map((table: any) => (
                  <div
                    key={table.name}
                    className="p-3.5 rounded-xl border border-white/10 bg-slate-950/40 flex flex-col justify-between"
                  >
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      {table.category}
                    </span>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-sm font-semibold text-slate-200 truncate pr-2">
                        {table.name}
                      </span>
                      <span className="text-lg font-bold font-mono text-indigo-400">
                        {table.count.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-300 text-xs font-medium">
                  <HardDrive className="w-4 h-4" />
                  Total Stored Core Entities
                </div>
                <span className="text-base font-bold font-mono text-indigo-400">
                  {data.totalRecords?.toLocaleString()} records
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Purge Maintenance Card */}
      <Card className="border-rose-500/20 shadow-lg shadow-rose-500/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trash2 className="w-5 h-5 text-rose-500" />
              Stale Log Purge &amp; Storage Maintenance
            </CardTitle>
            <div className="flex items-center gap-2 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20 text-xs font-semibold text-rose-400">
              <ShieldAlert className="w-3.5 h-3.5" />
              Storage Optimization
            </div>
          </div>
          <CardDescription>
            Purge historical application errors and verbose audit logs to maintain fast query performance and trim cloud database storage.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Log Type to Purge</Label>
              <Select value={logType} onValueChange={(val: any) => setLogType(val)}>
                <SelectTrigger className="bg-slate-900 border-white/10">
                  <SelectValue placeholder="Select log type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value="app_errors">Application Errors (AppError)</SelectItem>
                  <SelectItem value="audit_logs">System Audit Logs (AuditLog)</SelectItem>
                  <SelectItem value="all">All Logs (Errors + Audit Logs)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Retention Threshold</Label>
              <Select value={daysOld} onValueChange={(val: any) => setDaysOld(val || "30")}>
                <SelectTrigger className="bg-slate-900 border-white/10">
                  <SelectValue placeholder="Select retention threshold" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value="14">Older than 14 days (Aggressive)</SelectItem>
                  <SelectItem value="30">Older than 30 days (Recommended)</SelectItem>
                  <SelectItem value="60">Older than 60 days</SelectItem>
                  <SelectItem value="90">Older than 90 days (Conservative)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 items-end">
            <div className="sm:col-span-1 space-y-1.5">
              <Label className="text-xs">Admin Secret Password</Label>
              <Input
                type="password"
                placeholder="ADMIN_SQL_PASSWORD..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-900 border-white/10"
              />
            </div>

            <div className="sm:col-span-2 flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={purging || !password}
                onClick={() => handlePurge(true)}
                className="flex-1 border-white/10 hover:bg-white/5 text-xs h-10"
              >
                Estimate Records (Dry Run)
              </Button>

              <Button
                type="button"
                disabled={purging || !password}
                onClick={() => handlePurge(false)}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-xs h-10 gap-1.5"
              >
                {purging ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Confirm &amp; Purge Records
              </Button>
            </div>
          </div>

          {purgeResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs ${
                purgeResult.success
                  ? purgeResult.dryRun
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-300"
              }`}
            >
              <div className="font-semibold">{purgeResult.message}</div>
              {purgeResult.purged && (
                <div className="mt-1.5 flex gap-4 text-[11px] font-mono opacity-80">
                  <span>Errors: {purgeResult.purged.appErrors}</span>
                  <span>Audit Logs: {purgeResult.purged.auditLogs}</span>
                  <span>Total: {purgeResult.purged.total}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
