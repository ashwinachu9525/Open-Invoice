"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { dispatchAdminCronTask } from "@/actions/admin-tools"
import { toast } from "sonner"
import {
  PlayCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Terminal,
  RotateCcw,
  Sparkles,
} from "lucide-react"

export function AdminCronDispatcher() {
  const [task, setTask] = useState<"recurring_invoices" | "auto_freeze" | "trial_check" | "temp_cleanup">("recurring_invoices")
  const [force, setForce] = useState(false)
  const [password, setPassword] = useState("")
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<any | null>(null)

  const taskDescriptions = {
    recurring_invoices: "Scans active billing schedules, calculates next sequence number, creates invoice records, updates nextRunAt, and dispatches PDFs.",
    auto_freeze: "Checks companies with auto-freeze compliance settings enabled and seals older invoices from edits.",
    trial_check: "Identifies companies whose trial period has elapsed and safely updates subscription tier to FREE.",
    temp_cleanup: "Purges expired user sessions from auth tables and clears out stale Redis/Valkey cache keys.",
  }

  async function handleDispatch(e: React.FormEvent) {
    e.preventDefault()
    if (!password) {
      toast.error("Please enter the SQL Admin password.")
      return
    }

    setRunning(true)
    setResult(null)

    try {
      const res = await dispatchAdminCronTask(task, password, { force })
      setResult(res)
      if (res.success) {
        toast.success(res.message || "Cron task executed successfully.")
      } else {
        toast.error(res.error || "Failed to execute cron task.")
      }
    } catch (err: any) {
      setResult({
        success: false,
        error: err.message || "An unexpected error occurred while executing cron task.",
      })
      toast.error("Execution error.")
    } finally {
      setRunning(false)
    }
  }

  return (
    <Card className="border-amber-500/20 shadow-lg shadow-amber-500/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-amber-500" />
            Background Automation &amp; Cron Dispatcher
          </CardTitle>
          <div className="flex items-center gap-2 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 text-xs font-semibold text-amber-400">
            <Terminal className="w-3.5 h-3.5" />
            On-Demand Worker
          </div>
        </div>
        <CardDescription>
          Trigger recurring scheduled billing, auto-freeze compliance checks, and system maintenance jobs without waiting for external webhooks.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <form onSubmit={handleDispatch} className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Select Automated Task
            </Label>
            <Select
              value={task}
              onValueChange={(val: any) => {
                setTask(val)
                setResult(null)
              }}
            >
              <SelectTrigger className="bg-slate-900 border-white/10">
                <SelectValue placeholder="Choose task to trigger" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800">
                <SelectItem value="recurring_invoices">
                  ⚡️ Generate Recurring Invoices Batch (recurring_invoices)
                </SelectItem>
                <SelectItem value="auto_freeze">
                  ❄️ Invoice Auto-Freeze Compliance Worker (auto_freeze)
                </SelectItem>
                <SelectItem value="trial_check">
                  ⏳ Sweep Expired Company Trials (trial_check)
                </SelectItem>
                <SelectItem value="temp_cleanup">
                  🧹 Purge Expired Sessions &amp; Memory Cache (temp_cleanup)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {taskDescriptions[task]}
            </p>
          </div>

          {task === "recurring_invoices" && (
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-white/5">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold text-slate-200">Force Execution</Label>
                <p className="text-xs text-muted-foreground">
                  If enabled, generates invoices immediately even if <code className="text-amber-400">nextRunAt</code> is in the future.
                </p>
              </div>
              <Switch checked={force} onCheckedChange={setForce} />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3 items-end">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">
                SQL Admin Secret Password
              </Label>
              <Input
                type="password"
                placeholder="Enter ADMIN_SQL_PASSWORD..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-900 border-white/10"
              />
            </div>

            <Button
              type="submit"
              disabled={running || !password}
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold gap-2 shadow-md shadow-amber-500/20"
            >
              {running ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Dispatching...
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4" />
                  Run Task Now
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Execution Output */}
        {result && (
          <div
            className={`p-4 rounded-xl border ${
              result.success
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-rose-500/10 border-rose-500/20 text-rose-400"
            }`}
          >
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 mt-0.5 shrink-0" />
              )}
              <div className="space-y-2 w-full">
                <div>
                  <h4 className="font-bold text-sm">
                    {result.success ? "Task Completed Successfully" : "Task Execution Failed"}
                  </h4>
                  <p className="text-xs mt-0.5 text-slate-300">
                    {result.message || result.error}
                  </p>
                </div>

                {result.durationMs !== undefined && (
                  <div className="flex items-center gap-4 text-xs font-mono text-slate-400 pt-1">
                    <span>Task: <b className="text-slate-200">{result.task}</b></span>
                    <span>Execution Time: <b className="text-slate-200">{result.durationMs}ms</b></span>
                  </div>
                )}

                {result.result && (
                  <pre className="p-3 bg-black/40 rounded-lg text-[11px] font-mono text-slate-300 overflow-x-auto border border-white/5">
                    {JSON.stringify(result.result, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
