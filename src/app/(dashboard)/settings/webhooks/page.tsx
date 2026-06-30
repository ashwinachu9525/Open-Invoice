"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { getWebhooks, createWebhook, deleteWebhook, toggleWebhook } from "@/actions/webhook"
import { getCompany } from "@/actions/company"
import { toast } from "sonner"
import { Trash2, Link as LinkIcon, ShieldAlert, Loader2, Copy, Check } from "lucide-react"

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<any[]>([])
  const [companyId, setCompanyId] = useState<string>("")
  const [url, setUrl] = useState("")
  const [createdEvent, setCreatedEvent] = useState(true)
  const [paidEvent, setPaidEvent] = useState(true)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const [hooksList, comp] = await Promise.all([
          getWebhooks(),
          getCompany()
        ])
        setWebhooks(hooksList)
        if (comp) setCompanyId(comp.id)
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
        {/* Left Column: Form & Guide */}
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
    </div>
  )
}
