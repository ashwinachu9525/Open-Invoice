"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { 
  pauseRecurringSchedule, 
  resumeRecurringSchedule, 
  cancelRecurringSchedule, 
  runRecurringScheduleNow,
  getCronSetupInfo
} from "@/actions/recurring"
import { toast } from "sonner"
import { 
  CalendarClock, 
  Play, 
  Pause, 
  XCircle, 
  ExternalLink, 
  Mail, 
  MailWarning, 
  Zap, 
  Loader2, 
  Clock, 
  Copy, 
  Check, 
  Terminal, 
  ShieldCheck, 
  CheckCircle2,
  AlertCircle
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface RecurringSchedulesListProps {
  initialSchedules: any[]
}

const statusConfig: Record<string, { label: string; class: string }> = {
  ACTIVE:    { label: "Active",    class: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" },
  PAUSED:    { label: "Paused",    class: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" },
  CANCELLED: { label: "Cancelled", class: "bg-red-500/20 text-red-400 border border-red-500/30" },
}

export function RecurringSchedulesList({ initialSchedules }: RecurringSchedulesListProps) {
  const [schedules, setSchedules] = useState<any[]>(initialSchedules)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [cronDialogOpen, setCronDialogOpen] = useState(false)
  const [cronInfo, setCronInfo] = useState<{ hasCronSecret: boolean; cronSecret: string; endpointPath: string } | null>(null)
  const [loadingCronInfo, setLoadingCronInfo] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [testStatus, setTestStatus] = useState<"idle" | "running" | "success" | "error">("idle")
  const [testOutput, setTestOutput] = useState<any | null>(null)
  const router = useRouter()

  const origin = typeof window !== "undefined" ? window.location.origin : "https://your-domain.vercel.app"
  const cronUrlWithSecret = cronInfo?.cronSecret 
    ? `${origin}${cronInfo.endpointPath || "/api/cron/recurring"}?secret=${cronInfo.cronSecret}`
    : `${origin}${cronInfo?.endpointPath || "/api/cron/recurring"}`
  const curlCmd = `curl -X GET "${cronUrlWithSecret}"`

  async function openCronDialog() {
    setCronDialogOpen(true)
    if (!cronInfo) {
      setLoadingCronInfo(true)
      try {
        const info = await getCronSetupInfo()
        if (info.success) {
          setCronInfo(info as any)
        }
      } catch (e) {
        console.error("Failed to load cron info:", e)
      } finally {
        setLoadingCronInfo(false)
      }
    }
  }

  function copyToClipboard(text: string, key: string) {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text)
      setCopiedKey(key)
      toast.success("Copied to clipboard!")
      setTimeout(() => setCopiedKey(null), 2000)
    }
  }

  async function handleTestCron() {
    setTestStatus("running")
    setTestOutput(null)
    try {
      const url = cronInfo?.cronSecret
        ? `/api/cron/recurring?secret=${cronInfo.cronSecret}`
        : `/api/cron/recurring`
      const res = await fetch(url, { method: "GET" })
      const data = await res.json()
      setTestOutput({ status: res.status, ok: res.ok, data })
      if (res.ok) {
        setTestStatus("success")
        toast.success("Cron endpoint responded successfully (200 OK)!")
      } else {
        setTestStatus("error")
        toast.error(`Cron endpoint returned status ${res.status}`)
      }
    } catch (err: any) {
      setTestStatus("error")
      setTestOutput({ error: err.message || "Failed to reach endpoint" })
      toast.error("Failed to connect to cron endpoint")
    }
  }

  async function handleRunNow(invoiceId: string) {
    setPendingId(invoiceId)
    try {
      const res = await runRecurringScheduleNow(invoiceId)
      if (res.success && res.invoiceId) {
        toast.success(`Generated Invoice ${res.invoiceNumber} successfully!`)
        router.refresh()
      } else {
        toast.error(res.error || "Failed to generate invoice from schedule")
      }
    } catch {
      toast.error("Error generating invoice")
    } finally {
      setPendingId(null)
    }
  }

  async function handlePause(invoiceId: string) {
    setPendingId(invoiceId)
    try {
      const res = await pauseRecurringSchedule(invoiceId)
      if (res.success) {
        setSchedules(prev => prev.map(s => s.invoiceId === invoiceId ? { ...s, status: "PAUSED" } : s))
        toast.success("Schedule paused successfully")
        router.refresh()
      } else {
        toast.error(res.error || "Failed to pause schedule")
      }
    } catch {
      toast.error("Error pausing schedule")
    } finally {
      setPendingId(null)
    }
  }

  async function handleResume(invoiceId: string) {
    setPendingId(invoiceId)
    try {
      const res = await resumeRecurringSchedule(invoiceId)
      if (res.success) {
        setSchedules(prev => prev.map(s => s.invoiceId === invoiceId ? { ...s, status: "ACTIVE" } : s))
        toast.success("Schedule resumed successfully")
        router.refresh()
      } else {
        toast.error(res.error || "Failed to resume schedule")
      }
    } catch {
      toast.error("Error resuming schedule")
    } finally {
      setPendingId(null)
    }
  }

  async function handleCancel(invoiceId: string) {
    setPendingId(invoiceId)
    try {
      const res = await cancelRecurringSchedule(invoiceId)
      if (res.success) {
        setSchedules(prev => prev.map(s => s.invoiceId === invoiceId ? { ...s, status: "CANCELLED" } : s))
        toast.success("Schedule cancelled successfully")
        router.refresh()
      } else {
        toast.error(res.error || "Failed to cancel schedule")
      }
    } catch {
      toast.error("Error cancelling schedule")
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Top Action & Helper Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-white/8 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-200">Automated Webcron Scheduling</h4>
            <p className="text-[11px] text-muted-foreground">
              Trigger background recurring generation on time via cron-job.org or Vercel Cron.
            </p>
          </div>
        </div>

        <Button
          onClick={openCronDialog}
          variant="outline"
          size="sm"
          className="text-xs h-8 gap-1.5 border-indigo-500/30 text-indigo-300 hover:text-indigo-200 hover:bg-indigo-500/10 font-medium shrink-0"
        >
          <Clock className="h-3.5 w-3.5 text-indigo-400" />
          cron-job.org Setup
        </Button>
      </div>

      {schedules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
            <CalendarClock className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-medium text-slate-200">No recurring schedules found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Open any existing invoice detail page and click "Make Recurring" to create a schedule.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/8 hover:bg-transparent">
                <TableHead className="text-slate-300">Template Invoice</TableHead>
                <TableHead className="text-slate-300">Customer</TableHead>
                <TableHead className="text-slate-300">Frequency</TableHead>
                <TableHead className="text-slate-300">Next Run Date</TableHead>
                <TableHead className="text-slate-300">Auto Send Email</TableHead>
                <TableHead className="text-slate-300">Status</TableHead>
                <TableHead className="text-slate-300 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((sch) => {
                const status = statusConfig[sch.status] || { label: sch.status, class: "" }
                return (
                  <TableRow key={sch.id} className="border-b border-white/5 hover:bg-white/5">
                    <TableCell className="font-medium">
                      <Link href={`/invoices/${sch.invoiceId}`} className="text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1">
                        {sch.invoice?.invoiceNumber || "Invoice"}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </TableCell>
                    <TableCell className="text-slate-300">{sch.invoice?.customer?.name || "Customer"}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-300">{sch.frequency}</TableCell>
                    <TableCell className="text-slate-300">
                      {new Date(sch.nextRunAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </TableCell>
                    <TableCell>
                      {sch.autoSend ? (
                        <span className="flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                          <Mail className="h-3.5 w-3.5" /> Yes
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-slate-400 text-xs font-semibold">
                          <MailWarning className="h-3.5 w-3.5" /> No
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${status.class}`}>
                        {status.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5 flex-wrap">
                        {sch.status === "ACTIVE" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRunNow(sch.invoiceId)}
                            disabled={pendingId === sch.invoiceId}
                            title="Generate recurring invoice right now"
                            className="h-8 text-violet-400 hover:text-violet-300 hover:bg-violet-400/10 gap-1 font-semibold border border-violet-500/20"
                          >
                            {pendingId === sch.invoiceId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />} Run Now
                          </Button>
                        )}
                        {sch.status === "ACTIVE" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePause(sch.invoiceId)}
                            disabled={pendingId === sch.invoiceId}
                            className="h-8 text-yellow-400 hover:text-yellow-350 hover:bg-yellow-400/10 gap-1"
                          >
                            <Pause className="h-3.5 w-3.5" /> Pause
                          </Button>
                        )}
                        {sch.status === "PAUSED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResume(sch.invoiceId)}
                            disabled={pendingId === sch.invoiceId}
                            className="h-8 text-emerald-400 hover:text-emerald-350 hover:bg-emerald-400/10 gap-1"
                          >
                            <Play className="h-3.5 w-3.5" /> Resume
                          </Button>
                        )}
                        {sch.status !== "CANCELLED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancel(sch.invoiceId)}
                            disabled={pendingId === sch.invoiceId}
                            className="h-8 text-red-400 hover:text-red-350 hover:bg-red-400/10 gap-1"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Cancel
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* cron-job.org & Webcron Setup Dialog */}
      <Dialog open={cronDialogOpen} onOpenChange={setCronDialogOpen}>
        <DialogContent className="max-w-2xl bg-slate-950 border border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-100">
                  cron-job.org Recurring Scheduler
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Use the free <b>cron-job.org</b> service to trigger recurring invoice generation automatically without Vercel Pro limits.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {loadingCronInfo ? (
            <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-xs">Loading webhook details...</span>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Endpoint URL Card */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    Webhook Endpoint URL
                  </span>
                  {cronInfo?.hasCronSecret ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono">
                      Secret Protected
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
                      Open (Set CRON_SECRET in .env)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 p-2 rounded-lg bg-slate-950 font-mono text-xs text-indigo-300 select-all border border-slate-800 break-all">
                    {cronUrlWithSecret}
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => copyToClipboard(cronUrlWithSecret, "url")}
                    className="shrink-0 h-9 gap-1 text-xs"
                  >
                    {copiedKey === "url" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedKey === "url" ? "Copied" : "Copy URL"}
                  </Button>
                </div>
              </div>

              {/* Step-by-Step Instructions */}
              <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 space-y-3">
                <h5 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  How to setup in 2 minutes on cron-job.org:
                </h5>

                <ol className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 font-semibold text-[11px]">
                      1
                    </span>
                    <div>
                      Create a free account or log in at{" "}
                      <a
                        href="https://cron-job.org"
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-0.5 underline font-medium"
                      >
                        cron-job.org <ExternalLink className="h-3 w-3 inline" />
                      </a>.
                    </div>
                  </li>

                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 font-semibold text-[11px]">
                      2
                    </span>
                    <div>
                      Click <b>"Create Cronjob"</b> and enter:
                      <ul className="mt-1 space-y-1 text-slate-400 list-disc list-inside">
                        <li><b>Title:</b> <span className="text-slate-300">Open-Invoice Recurring Invoices</span></li>
                        <li><b>URL:</b> Paste the Webhook Endpoint URL copied above</li>
                        <li><b>Request Method:</b> <span className="text-emerald-400 font-mono">GET</span></li>
                      </ul>
                    </div>
                  </li>

                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 font-semibold text-[11px]">
                      3
                    </span>
                    <div>
                      <b>Set Schedule:</b> Choose <b>Every day at 00:00 (Midnight)</b> or <b>Every hour</b> (cron-job.org timezone can match your Indian Standard Time / IST).
                    </div>
                  </li>

                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 font-semibold text-[11px]">
                      4
                    </span>
                    <div>
                      <b>Notifications:</b> Enable <i>"Notify on failure"</i> so cron-job.org emails you if any database error occurs. Click <b>"Create"</b>!
                    </div>
                  </li>
                </ol>
              </div>

              {/* Live Test Runner Card */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/8 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                    <Terminal className="h-4 w-4 text-violet-400" />
                    Test Endpoint Connectivity
                  </div>
                  <Button
                    size="sm"
                    onClick={handleTestCron}
                    disabled={testStatus === "running"}
                    className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium gap-1.5"
                  >
                    {testStatus === "running" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Zap className="h-3.5 w-3.5" />
                    )}
                    {testStatus === "running" ? "Testing..." : "Test Endpoint Now"}
                  </Button>
                </div>

                {testOutput && (
                  <div className="mt-2 p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono space-y-1.5 overflow-x-auto">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Response Status:</span>
                      {testOutput.ok ? (
                        <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="h-3 w-3" /> {testOutput.status} OK
                        </span>
                      ) : (
                        <span className="text-red-400 flex items-center gap-1 font-semibold">
                          <AlertCircle className="h-3 w-3" /> {testOutput.status || "Error"}
                        </span>
                      )}
                    </div>
                    <pre className="text-slate-300 max-h-40 overflow-y-auto">
                      {JSON.stringify(testOutput.data || testOutput.error, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* cURL Snippet */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Terminal cURL command:</span>
                  <button
                    onClick={() => copyToClipboard(curlCmd, "curl")}
                    className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    {copiedKey === "curl" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    {copiedKey === "curl" ? "Copied" : "Copy cURL"}
                  </button>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 font-mono text-[11px] text-slate-300 select-all border border-slate-800 break-all">
                  {curlCmd}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCronDialogOpen(false)}
              className="text-xs"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
