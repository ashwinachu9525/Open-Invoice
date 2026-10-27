"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Mail, CheckCircle2, AlertTriangle, Building, Clock, XCircle } from "lucide-react"

interface EmailLogItem {
  id: string
  to: string
  subject: string
  status: string
  sentAt: Date
  error: string | null
  company?: { id: string; name: string } | null
  invoiceId?: string | null
}

interface AdminEmailLogsTabProps {
  emailLogs: EmailLogItem[]
}

export function AdminEmailLogsTab({ emailLogs }: AdminEmailLogsTabProps) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")

  const filteredLogs = useMemo(() => {
    return emailLogs.filter((log) => {
      const matchesSearch =
        log.to.toLowerCase().includes(search.toLowerCase()) ||
        log.subject.toLowerCase().includes(search.toLowerCase()) ||
        (log.company?.name && log.company.name.toLowerCase().includes(search.toLowerCase())) ||
        (log.error && log.error.toLowerCase().includes(search.toLowerCase()))

      if (!matchesSearch) return false

      if (statusFilter === "ALL") return true
      if (statusFilter === "SENT") return log.status === "sent"
      if (statusFilter === "FAILED") return log.status === "failed"

      return true
    })
  }, [emailLogs, search, statusFilter])

  const totalCount = emailLogs.length
  const failedCount = emailLogs.filter((l) => l.status === "failed").length
  const sentCount = emailLogs.filter((l) => l.status === "sent").length
  const successRate = totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 100

  return (
    <div className="space-y-4">
      {/* Overview Metric Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl border border-white/10 bg-slate-950/40 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">
              Total Logged Emails
            </span>
            <div className="text-xl font-bold font-mono text-slate-100">{totalCount}</div>
          </div>
          <span className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Mail className="w-4 h-4" />
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-white/10 bg-slate-950/40 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">
              Successfully Delivered
            </span>
            <div className="text-xl font-bold font-mono text-emerald-400">{sentCount}</div>
          </div>
          <span className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-white/10 bg-slate-950/40 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">
              Delivery Success Rate
            </span>
            <div className="text-xl font-bold font-mono text-indigo-400">{successRate}%</div>
          </div>
          <span className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <span className="text-xs font-bold">{failedCount} err</span>
          </span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search recipient email, subject, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-900 border-white/10"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant={statusFilter === "ALL" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("ALL")}
            className={`text-xs h-8 px-2.5 rounded-lg border-white/10 ${
              statusFilter === "ALL" ? "bg-amber-600 hover:bg-amber-500 text-white font-medium" : "text-muted-foreground hover:bg-white/5"
            }`}
          >
            All Logs ({totalCount})
          </Button>
          <Button
            type="button"
            variant={statusFilter === "SENT" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("SENT")}
            className={`text-xs h-8 px-2.5 rounded-lg border-white/10 ${
              statusFilter === "SENT" ? "bg-emerald-600 hover:bg-emerald-500 text-white font-medium" : "text-muted-foreground hover:bg-white/5"
            }`}
          >
            Delivered ({sentCount})
          </Button>
          <Button
            type="button"
            variant={statusFilter === "FAILED" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("FAILED")}
            className={`text-xs h-8 px-2.5 rounded-lg border-white/10 ${
              statusFilter === "FAILED" ? "bg-rose-600 hover:bg-rose-500 text-white font-medium" : "text-muted-foreground hover:bg-white/5"
            }`}
          >
            Failed ({failedCount})
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-slate-900/80">
            <tr>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Recipient &amp; Subject</th>
              <th className="px-4 py-3 font-medium">Tenant Company</th>
              <th className="px-4 py-3 font-medium">Dispatched At</th>
              <th className="px-4 py-3 font-medium">Details / Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-slate-950/40">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                  No email logs found matching criteria.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const isSuccess = log.status === "sent"
                return (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isSuccess
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {isSuccess ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Sent
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" /> Failed
                          </>
                        )}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-100">{log.to}</div>
                      <div className="text-xs text-slate-400 truncate max-w-[280px]">
                        {log.subject}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Building className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[140px]">
                          {log.company?.name || "System"}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(log.sentAt).toLocaleString()}
                    </td>

                    <td className="px-4 py-3 text-xs">
                      {log.error ? (
                        <div className="font-mono text-[11px] text-rose-300 bg-rose-950/40 p-1.5 rounded border border-rose-800/30 max-w-[240px] truncate" title={log.error}>
                          {log.error}
                        </div>
                      ) : (
                        <span className="text-slate-500">Handshake verified</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
