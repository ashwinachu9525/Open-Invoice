"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getSystemHealthCheck } from "@/actions/admin-tools"
import {
  Activity,
  Cpu,
  HardDrive,
  Users,
  Database,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Server,
  Zap,
  Clock,
} from "lucide-react"
import { toast } from "sonner"

export default function AdminHealthPage() {
  const [healthData, setHealthData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function fetchHealthData(isManual = false) {
    if (isManual) setRefreshing(true)
    try {
      const data = await getSystemHealthCheck()
      setHealthData(data)
      if (isManual) toast.success("Health metrics refreshed")
    } catch (err: any) {
      console.error("Health check error", err)
      toast.error(err.message || "Failed to load health check data")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchHealthData()
    // Auto refresh every 30 seconds
    const interval = setInterval(() => {
      fetchHealthData()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Gathering system diagnostics &amp; telemetry...</p>
      </div>
    )
  }

  if (!healthData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <AlertTriangle className="w-12 h-12 text-rose-500" />
        <div>
          <h2 className="text-xl font-bold text-slate-100">Failed to load system health</h2>
          <p className="text-sm text-slate-400 mt-1">Unable to fetch system metrics at this time.</p>
        </div>
        <Button onClick={() => fetchHealthData(true)} variant="outline">
          Retry
        </Button>
      </div>
    )
  }

  const { cpu, memory, users, services, uptimeSeconds, timestamp } = healthData

  // Calculate system status
  const isMemHigh = memory.usedPercentage > 85
  const isDbErr = services.database.status !== "healthy"
  const isSystemHealthy = !isMemHigh && !isDbErr

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (days > 0) return `${days}d ${hours}h ${mins}m`
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
  }

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">System Health &amp; Telemetry</h1>
            {isSystemHealthy ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> All Systems Operational
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5" /> Degraded Performance
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time monitoring of CPU, RAM memory, concurrent users, and infrastructure services.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Last Updated</div>
            <div className="text-xs text-slate-300 font-mono">{new Date(timestamp).toLocaleTimeString()}</div>
          </div>
          <Button
            onClick={() => fetchHealthData(true)}
            disabled={refreshing}
            variant="outline"
            className="bg-slate-900 border-white/10 text-slate-200 hover:bg-slate-800"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin text-amber-500" : ""}`} />
            Refresh Telemetry
          </Button>
        </div>
      </div>

      {/* Top Overview Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* CPU Summary */}
        <Card className="bg-slate-950/40 border-white/10 backdrop-blur-md">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">CPU Cores</p>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">{cpu.cores} Cores</h3>
              <p className="text-xs text-slate-400 mt-1 font-mono">Load: {cpu.loadAvg[0]?.toFixed(2)} (1m)</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Cpu className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* RAM Usage Summary */}
        <Card className="bg-slate-950/40 border-white/10 backdrop-blur-md">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">RAM Memory</p>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">{memory.usedPercentage}%</h3>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                {memory.usedMB} MB / {memory.totalMB} MB
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <HardDrive className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Active Concurrent Sessions */}
        <Card className="bg-slate-950/40 border-white/10 backdrop-blur-md">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Sessions</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">{users.activeSessions} Online</h3>
              <p className="text-xs text-slate-400 mt-1 font-mono">{users.activeUsers24h} active in 24h</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* System Uptime */}
        <Card className="bg-slate-950/40 border-white/10 backdrop-blur-md">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Process Uptime</p>
              <h3 className="text-2xl font-bold text-sky-400 mt-1">{formatUptime(uptimeSeconds)}</h3>
              <p className="text-xs text-slate-400 mt-1 font-mono">Node {process.version}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Memory Telemetry Card */}
        <Card className="border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-indigo-400" />
              Memory Allocation &amp; Usage
            </CardTitle>
            <CardDescription>System RAM utilization and Node.js process heap memory.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Memory Usage Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-slate-200">System RAM Usage</span>
                <span className="font-mono text-indigo-400 font-semibold">{memory.usedPercentage}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden border border-white/5 p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    memory.usedPercentage > 85 ? "bg-rose-500" : memory.usedPercentage > 65 ? "bg-amber-500" : "bg-indigo-500"
                  }`}
                  style={{ width: `${memory.usedPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-400 pt-1 font-mono">
                <span>Used: {memory.usedMB} MB</span>
                <span>Free: {memory.freeMB} MB</span>
                <span>Total: {memory.totalMB} MB</span>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4 grid grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                <p className="text-[10px] uppercase font-semibold text-slate-400">Process RSS</p>
                <p className="text-base font-bold text-slate-100 font-mono mt-1">{memory.processRssMB} MB</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                <p className="text-[10px] uppercase font-semibold text-slate-400">Heap Used</p>
                <p className="text-base font-bold text-slate-100 font-mono mt-1">{memory.heapUsedMB} MB</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                <p className="text-[10px] uppercase font-semibold text-slate-400">Heap Total</p>
                <p className="text-base font-bold text-slate-100 font-mono mt-1">{memory.heapTotalMB} MB</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CPU Telemetry Card */}
        <Card className="border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-amber-500" />
              CPU &amp; System Load Average
            </CardTitle>
            <CardDescription>Processor core architecture and OS load averages (1m, 5m, 15m).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 font-medium">Processor Model:</span>
                <span className="text-slate-200 font-mono text-xs truncate max-w-[240px]">{cpu.model}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 font-medium">CPU Core Count:</span>
                <span className="text-slate-200 font-mono font-semibold">{cpu.cores} Physical / Logical Cores</span>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4">
              <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider mb-3">Load Averages</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                  <p className="text-[10px] uppercase font-semibold text-slate-400">1 Minute</p>
                  <p className="text-base font-bold text-amber-400 font-mono mt-1">{cpu.loadAvg[0]?.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                  <p className="text-[10px] uppercase font-semibold text-slate-400">5 Minutes</p>
                  <p className="text-base font-bold text-slate-200 font-mono mt-1">{cpu.loadAvg[1]?.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                  <p className="text-[10px] uppercase font-semibold text-slate-400">15 Minutes</p>
                  <p className="text-base font-bold text-slate-200 font-mono mt-1">{cpu.loadAvg[2]?.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Concurrent Users & Services Grid */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Concurrent Users Card */}
        <Card className="border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              Concurrent Users &amp; Sessions
            </CardTitle>
            <CardDescription>Live user activity metrics and active web authentication sessions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <p className="text-xs uppercase font-semibold text-emerald-400">Active Sessions</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{users.activeSessions}</p>
                <p className="text-[10px] text-slate-400 mt-1">Live NextAuth Sessions</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5">
                <p className="text-xs uppercase font-semibold text-slate-400">Active (24h)</p>
                <p className="text-2xl font-bold text-slate-100 mt-1">{users.activeUsers24h}</p>
                <p className="text-[10px] text-slate-400 mt-1">Users active today</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5">
                <p className="text-xs uppercase font-semibold text-slate-400">Total Accounts</p>
                <p className="text-2xl font-bold text-slate-100 mt-1">{users.totalUsers}</p>
                <p className="text-[10px] text-slate-400 mt-1">Registered users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Infrastructure & Database Services Card */}
        <Card className="border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5 text-sky-400" />
              Infrastructure Services
            </CardTitle>
            <CardDescription>Connectivity &amp; query latency for Primary Database and Valkey Redis Cache.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Database Status */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-100">Primary Database</h4>
                  <p className="text-xs text-slate-400 uppercase font-mono">{services.database.provider}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" /> Healthy ({services.database.latencyMs}ms)
                </span>
              </div>
            </div>

            {/* Valkey / Redis Cache Status */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-100">Valkey / Redis Cache</h4>
                  <p className="text-xs text-slate-400 font-mono">
                    {services.redis.isConfigured ? "Configured & Connected" : "Local Memory Fallback"}
                  </p>
                </div>
              </div>

              <div className="text-right">
                {services.redis.status === "healthy" ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" /> Connected ({services.redis.latencyMs}ms)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-white/10">
                    In-Memory / Standard DB
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
