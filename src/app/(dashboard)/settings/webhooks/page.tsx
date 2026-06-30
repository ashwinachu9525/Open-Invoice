"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { getWebhooks, createWebhook, deleteWebhook, toggleWebhook } from "@/actions/webhook"
import { getWebhookLogs, retryWebhookLog } from "@/actions/webhook-logs"
import { getCompany } from "@/actions/company"
import { toast } from "sonner"
import { Trash2, Link as LinkIcon, ShieldAlert, Loader2, Copy, Check, Info, RefreshCw } from "lucide-react"

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [companyId, setCompanyId] = useState<string>("")
  const [url, setUrl] = useState("")
  const [createdEvent, setCreatedEvent] = useState(true)
  const [paidEvent, setPaidEvent] = useState(true)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  
  // Log Inspection Modal State
  const [selectedLog, setSelectedLog] = useState<any>(null)
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null)

  async function loadLogs() {
    try {
      const logsList = await getWebhookLogs()
      setLogs(logsList)
    } catch {
      toast.error("Failed to load delivery logs")
    }
  }

  useEffect(() => {
    async function fetchData() {
      try {
        const [hooksList, comp] = await Promise.all([
          getWebhooks(),
          getCompany()
        ])
        setWebhooks(hooksList)
        if (comp) setCompanyId(comp.id)
        await loadLogs()
      } catch (err) {
        toast.error("Failed to load settings")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  async function handleAddWebhook(e: React.FormEvent) {
    e.preventDefault()
    if (!url) {
      toast.error("URL is required")
      return
    }
    const events = [
      createdEvent ? "invoice.created" : null,
      paidEvent ? "invoice.paid" : null
    ].filter(Boolean).join(",")

    if (!events) {
      toast.error("Please select at least one event")
      return
    }

    setSubmitting(true)
    try {
      const res = await createWebhook(url, events)
      if (res.success && res.webhook) {
        setWebhooks((prev) => [res.webhook, ...prev])
        setUrl("")
        toast.success("Webhook registered successfully")
      } else {
        toast.error(res.error || "Failed to create webhook")
      }
    } catch {
      toast.error("Failed to add webhook")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await deleteWebhook(id)
      if (res.success) {
        setWebhooks((prev) => prev.filter((h) => h.id !== id))
        toast.success("Webhook deleted")
      } else {
        toast.error(res.error || "Failed to delete")
      }
    } catch {
      toast.error("Error deleting webhook")
    }
  }

  async function handleToggle(id: string, currentStatus: boolean) {
    try {
      const res = await toggleWebhook(id, !currentStatus)
      if (res.success) {
        setWebhooks((prev) =>
          prev.map((h) => (h.id === id ? { ...h, isActive: !currentStatus } : h))
        )
        toast.success("Webhook status updated")
      } else {
        toast.error(res.error || "Failed to update webhook status")
      }
    } catch {
      toast.error("Error toggling webhook status")
    }
  }

  function handleCopySecret() {
    navigator.clipboard.writeText(companyId)
    setCopied(true)
    toast.success("Signing secret copied!")
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRetry(logId: string) {
    setRetryingLogId(logId)
    try {
      const res = await retryWebhookLog(logId)
      if (res.success) {
        toast.success("Webhook retried successfully")
        setSelectedLog(null)
        await loadLogs()
      } else {
        toast.error(res.error || "Failed to retry webhook")
      }
    } catch {
      toast.error("An error occurred during webhook retry")
    } finally {
      setRetryingLogId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[300px] w-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
        <p className="text-gray-500">Receive HTTP POST payloads in real-time when billing events occur.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Form & Configs */}
        <div className="md:col-span-2 space-y-6">
          {/* Register Card */}
          <Card>
            <CardHeader>
              <CardTitle>Register Webhook Endpoint</CardTitle>
              <CardDescription>Configure a new URL to listen for system notifications.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddWebhook} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">Endpoint URL</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="webhook-url"
                      placeholder="https://yourdomain.com/webhooks/invoice"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Events to send</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/50 cursor-pointer">
                      <Checkbox
                        id="event-created"
                        checked={createdEvent}
                        onCheckedChange={(checked) => setCreatedEvent(!!checked)}
                      />
                      <label htmlFor="event-created" className="text-sm font-medium leading-none cursor-pointer flex-1">
                        Invoice Created
                        <span className="block text-xs text-muted-foreground mt-1">Triggers when an invoice draft is saved.</span>
                      </label>
                    </div>

                    <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/50 cursor-pointer">
                      <Checkbox
                        id="event-paid"
                        checked={paidEvent}
                        onCheckedChange={(checked) => setPaidEvent(!!checked)}
                      />
                      <label htmlFor="event-paid" className="text-sm font-medium leading-none cursor-pointer flex-1">
                        Invoice Paid
                        <span className="block text-xs text-muted-foreground mt-1">Triggers when balance due drops to 0.</span>
                      </label>
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-700">
                  {submitting ? "Registering..." : "Add Webhook"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Active Webhooks List */}
          <Card>
            <CardHeader>
              <CardTitle>Configured Webhooks</CardTitle>
              <CardDescription>Your active webhooks list.</CardDescription>
            </CardHeader>
            <CardContent>
              {webhooks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No webhooks configured yet. Register one above to start listening to events.
                </div>
              ) : (
                <div className="divide-y space-y-4">
                  {webhooks.map((hook) => (
                    <div key={hook.id} className="flex items-center justify-between pt-4 first:pt-0">
                      <div className="space-y-1">
                        <div className="font-semibold text-sm truncate max-w-lg">{hook.url}</div>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {hook.events.split(",").map((ev: string) => (
                            <span key={ev} className="text-[10px] font-mono px-2 py-0.5 bg-muted rounded border">
                              {ev}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={hook.isActive}
                            onCheckedChange={() => handleToggle(hook.id, hook.isActive)}
                          />
                          <span className="text-xs text-muted-foreground w-10">
                            {hook.isActive ? "Active" : "Paused"}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(hook.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Webhook Delivery Logs Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Webhook Delivery Logs</CardTitle>
                <CardDescription>History of recent webhook delivery attempts.</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={loadLogs}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No delivery logs recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground text-left">
                        <th className="pb-2 font-semibold">Event</th>
                        <th className="pb-2 font-semibold">URL</th>
                        <th className="pb-2 font-semibold">Status</th>
                        <th className="pb-2 font-semibold">Time</th>
                        <th className="pb-2 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-muted/30">
                          <td className="py-2.5 font-mono text-xs">{log.event}</td>
                          <td className="py-2.5 max-w-[200px] truncate">{log.url}</td>
                          <td className="py-2.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                log.success
                                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                  : "bg-red-500/10 text-red-500 border border-red-500/20"
                              }`}
                            >
                              {log.statusCode || "ERR"}
                            </span>
                          </td>
                          <td className="py-2.5 text-xs text-muted-foreground">
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </td>
                          <td className="py-2.5 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedLog(log)}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Webhook Secret & Security Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-500" /> Signing Secret
              </CardTitle>
              <CardDescription>Verify that webhooks originate from Open Invoice.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Each webhook payload is signed with a cryptographic signature sent in the <code>x-signature</code> header. 
                Use your Signing Secret to verify the HMAC-SHA256 hash.
              </p>
              
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Your Webhook Secret</span>
                <div className="flex items-center gap-1 bg-muted p-2 rounded border font-mono text-xs select-all justify-between break-all">
                  <span className="truncate pr-2">{companyId}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopySecret}
                    className="h-6 w-6 shrink-0"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="text-xs text-muted-foreground leading-relaxed bg-muted/30 border border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-foreground">Payload Structure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 font-mono bg-black/40 p-3 rounded-lg border max-h-[220px] overflow-y-auto">
              <pre>{JSON.stringify({
                id: "evt_3m7n...",
                event: "invoice.paid",
                timestamp: new Date().toISOString(),
                data: {
                  id: "inv_123...",
                  invoiceNumber: "INV-2026-0001",
                  finalAmount: 1180,
                  status: "PAID"
                }
              }, null, 2)}</pre>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delivery Log Inspection Modal */}
      {selectedLog && (
        <Dialog open={!!selectedLog} onOpenChange={(open) => { if (!open) setSelectedLog(null) }}>
          <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-slate-100">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Delivery Log Details</DialogTitle>
              <DialogDescription className="text-slate-400">
                Inspect details of the webhook delivery event.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 max-h-[450px] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="block text-xs font-semibold text-slate-400 uppercase">Event Name</span>
                  <span className="font-mono text-slate-200">{selectedLog.event}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400 uppercase">Target URL</span>
                  <span className="truncate block text-slate-200">{selectedLog.url}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400 uppercase">Status Code</span>
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${selectedLog.success ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                    {selectedLog.statusCode || "FAILED"}
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400 uppercase">Timestamp</span>
                  <span className="text-slate-200">{new Date(selectedLog.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="block text-xs font-semibold text-slate-400 uppercase">Payload Body (Sent)</span>
                <pre className="text-xs bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-slate-300 overflow-x-auto max-h-[160px] overflow-y-auto font-mono">
                  {selectedLog.requestBody ? JSON.stringify(JSON.parse(selectedLog.requestBody), null, 2) : ""}
                </pre>
              </div>

              <div className="space-y-1">
                <span className="block text-xs font-semibold text-slate-400 uppercase">Response Body (Received)</span>
                <pre className="text-xs bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-slate-300 overflow-x-auto max-h-[120px] overflow-y-auto">
                  {selectedLog.responseBody || <span className="text-slate-500 italic">No response payload returned</span>}
                </pre>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setSelectedLog(null)} disabled={!!retryingLogId}>
                Close
              </Button>
              <Button
                onClick={() => handleRetry(selectedLog.id)}
                disabled={!!retryingLogId}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {retryingLogId ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Retrying...
                  </>
                ) : (
                  "Retry Delivery Now"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
