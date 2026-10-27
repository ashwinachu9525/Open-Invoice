"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  verifyLlmKey,
  getReferralRedemptions,
  revokeReferralRedemption,
  inspectApiKeyAdmin,
  toggleApiKeyActiveAdmin,
  flushRedisCacheAdmin,
} from "@/actions/admin-tools"
import {
  Wrench,
  CheckCircle2,
  XCircle,
  Loader2,
  Gift,
  Trash2,
  Key,
  Shield,
  Calendar,
  RefreshCw,
  Mail,
  Clock,
  Database,
  Globe,
  Server,
  Layers,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { AdminSmtpTester } from "@/components/admin/admin-smtp-tester"
import { AdminCronDispatcher } from "@/components/admin/admin-cron-dispatcher"
import { AdminTableFootprint } from "@/components/admin/admin-table-footprint"
import { AdminDomainInspector } from "@/components/admin/admin-domain-inspector"

export default function AdminToolsPage() {
  const [provider, setProvider] = useState<"openai" | "gemini" | "nvidia">("openai")
  const [apiKey, setApiKey] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [llmResult, setLlmResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null)

  // Referral redemptions state
  const [redemptions, setRedemptions] = useState<any[]>([])
  const [loadingRedemptions, setLoadingRedemptions] = useState(true)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  useEffect(() => {
    async function loadRedemptions() {
      try {
        const data = await getReferralRedemptions()
        setRedemptions(data)
      } catch (err) {
        console.error("Failed to load redemptions", err)
        toast.error("Failed to load referral redemptions")
      } finally {
        setLoadingRedemptions(false)
      }
    }
    loadRedemptions()
  }, [])

  async function handleVerifyLlm(e: React.FormEvent) {
    e.preventDefault()
    setIsVerifying(true)
    setLlmResult(null)

    try {
      const res = await verifyLlmKey(provider, apiKey)
      setLlmResult(res)
    } catch {
      setLlmResult({ success: false, error: "An unexpected error occurred." })
    } finally {
      setIsVerifying(false)
    }
  }

  async function handleRevoke(redemptionId: string) {
    setRevokingId(redemptionId)
    try {
      const res = await revokeReferralRedemption(redemptionId)
      if (res.success) {
        toast.success(res.message || "Referral reward successfully revoked.")
        setRedemptions((prev) => prev.filter((r) => r.id !== redemptionId))
      } else {
        toast.error(res.error || "Failed to revoke referral reward")
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred while revoking.")
    } finally {
      setRevokingId(null)
    }
  }

  // API Key Inspector handlers
  const [inspectQuery, setInspectQuery] = useState("")
  const [isInspecting, setIsInspecting] = useState(false)
  const [keyDetails, setKeyDetails] = useState<any | null>(null)
  const [togglingActive, setTogglingActive] = useState(false)

  async function handleInspect(e: React.FormEvent) {
    e.preventDefault()
    if (!inspectQuery.trim()) return
    setIsInspecting(true)
    setKeyDetails(null)
    try {
      const res = await inspectApiKeyAdmin(inspectQuery)
      if (res.success && res.data) {
        setKeyDetails(res.data)
        toast.success("API Key found")
      } else {
        toast.error(res.error || "API Key not found")
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred during inspection")
    } finally {
      setIsInspecting(false)
    }
  }

  async function handleToggleActive() {
    if (!keyDetails) return
    setTogglingActive(true)
    try {
      const res = await toggleApiKeyActiveAdmin(keyDetails.id)
      if (res.success) {
        toast.success(res.message)
        setKeyDetails((prev: any) => ({ ...prev, isActive: !prev.isActive }))
      } else {
        toast.error(res.error || "Failed to update key status")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update key status")
    } finally {
      setTogglingActive(false)
    }
  }

  // Cache Manager state & handlers
  const [cachePattern, setCachePattern] = useState("*")
  const [isFlushingCache, setIsFlushingCache] = useState(false)

  async function handleFlushCache() {
    setIsFlushingCache(true)
    try {
      const res: any = await flushRedisCacheAdmin(cachePattern)
      if (res.success) {
        toast.success(res.message || "Cache successfully flushed")
      } else {
        toast.error(res.error || res.message || "Failed to flush cache")
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred while flushing cache")
    } finally {
      setIsFlushingCache(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Admin Tools &amp; Diagnostics</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Wrench className="w-3.5 h-3.5" />
              Central Utilities
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Diagnostic instruments, background cron dispatchers, storage managers, and tenant keys.
          </p>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs defaultValue="diagnostics" className="w-full space-y-6">
        <TabsList className="flex w-full overflow-x-auto justify-start lg:grid lg:grid-cols-4 p-1 bg-slate-900/80 border border-white/10 rounded-xl no-scrollbar">
          <TabsTrigger value="diagnostics" className="gap-2 text-xs sm:text-sm font-semibold shrink-0">
            <Mail className="w-4 h-4 text-indigo-400" />
            Network &amp; Diagnostics
          </TabsTrigger>
          <TabsTrigger value="cron" className="gap-2 text-xs sm:text-sm font-semibold shrink-0">
            <Clock className="w-4 h-4 text-amber-400" />
            Cron &amp; Automations
          </TabsTrigger>
          <TabsTrigger value="storage" className="gap-2 text-xs sm:text-sm font-semibold shrink-0">
            <Database className="w-4 h-4 text-emerald-400" />
            Storage &amp; Cache
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 text-xs sm:text-sm font-semibold shrink-0">
            <Key className="w-4 h-4 text-rose-400" />
            Keys &amp; Rewards
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Network & Diagnostics ── */}
        <TabsContent value="diagnostics" className="space-y-6 mt-0">
          <AdminSmtpTester />

          <div className="grid gap-6 lg:grid-cols-2">
            {/* LLM Key Verifier */}
            <Card className="border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  Multi-LLM Key Verifier
                </CardTitle>
                <CardDescription>
                  Verify connectivity with OpenAI, Google Gemini, and Nvidia NIM endpoints.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleVerifyLlm} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Select Provider</Label>
                    <Select value={provider} onValueChange={(val: any) => setProvider(val)}>
                      <SelectTrigger className="bg-slate-900 border-white/10">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800">
                        <SelectItem value="openai">OpenAI (GPT-4o / Models API)</SelectItem>
                        <SelectItem value="gemini">Google Gemini (Gemini Pro API)</SelectItem>
                        <SelectItem value="nvidia">Nvidia NIM (integrate.api.nvidia.com)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">API Key</Label>
                    <Input
                      type="password"
                      placeholder="Paste key to test connection..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      required
                      className="bg-slate-900 border-white/10"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isVerifying || !apiKey.trim()}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white font-medium"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying Key...
                      </>
                    ) : (
                      "Test Key Connectivity"
                    )}
                  </Button>

                  {llmResult && (
                    <div
                      className={`p-3.5 rounded-xl border text-xs ${
                        llmResult.success
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {llmResult.success ? (
                          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        )}
                        <div>
                          <div className="font-bold">
                            {llmResult.success ? "Key Successfully Authenticated" : "Verification Failed"}
                          </div>
                          <div className="mt-0.5 text-slate-300">
                            {llmResult.success ? llmResult.message : llmResult.error}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>

            {/* Custom Domain Inspector */}
            <AdminDomainInspector />
          </div>
        </TabsContent>

        {/* ── Tab 2: Automation & Cron Dispatcher ── */}
        <TabsContent value="cron" className="space-y-6 mt-0">
          <AdminCronDispatcher />
        </TabsContent>

        {/* ── Tab 3: Storage & Cache ── */}
        <TabsContent value="storage" className="space-y-6 mt-0">
          <AdminTableFootprint />

          {/* Redis & Valkey Cache Invalidator */}
          <Card className="border-amber-500/20 shadow-lg shadow-amber-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <RefreshCw className="w-5 h-5 text-amber-500" />
                Valkey / Redis Cache Manager
              </CardTitle>
              <CardDescription>
                Purge in-memory list caches, pre-rendered PDF buffers, and session transients.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3 items-end">
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs">Cache Invalidation Scope</Label>
                  <Select value={cachePattern} onValueChange={(val: any) => setCachePattern(val || "*")}>
                    <SelectTrigger className="bg-slate-900 border-white/10">
                      <SelectValue placeholder="Select cache scope" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      <SelectItem value="*">⚡️ Flush All Cache Database Keys (*)</SelectItem>
                      <SelectItem value="invoices:*">📄 Invoice List Caches (invoices:*)</SelectItem>
                      <SelectItem value="invoice:pdf:*">🖼️ PDF Base64 Buffer Caches (invoice:pdf:*)</SelectItem>
                      <SelectItem value="quotation:pdf:*">📜 Quotation PDF Caches (quotation:pdf:*)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Selected scope: <code className="text-amber-400 font-mono">{cachePattern}</code>
                  </p>
                </div>

                <div className="md:col-span-1">
                  <AlertDialog>
                    <AlertDialogTrigger render={
                      <Button
                        disabled={isFlushingCache}
                        className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-medium shadow-md shadow-amber-500/20"
                      >
                        {isFlushingCache ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Invalidating...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" /> Flush Cache Now
                          </>
                        )}
                      </Button>
                    } />
                    <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-slate-100 flex items-center gap-2">
                          <RefreshCw className="w-5 h-5 text-amber-500" /> Confirm Cache Invalidation
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                          Are you sure you want to flush Redis cache keys matching{" "}
                          <code className="text-amber-400 font-mono">{cachePattern}</code>? Subsequent queries will fetch
                          fresh data from the primary database.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex gap-2 justify-end">
                        <AlertDialogCancel className="border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleFlushCache}
                          className="bg-amber-600 hover:bg-amber-500 text-slate-100"
                        >
                          Confirm &amp; Flush
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 4: Security & Keys ── */}
        <TabsContent value="security" className="space-y-6 mt-0">
          {/* API Key Inspector & Manager */}
          <Card className="border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Key className="w-5 h-5 text-indigo-400" />
                API Key Inspector &amp; Status Manager
              </CardTitle>
              <CardDescription>
                Inspect tenant API keys, check company ownership, and toggle active status in real-time.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleInspect} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="Enter full API key, key hint (e.g. live_...), or ID..."
                    value={inspectQuery}
                    onChange={(e) => setInspectQuery(e.target.value)}
                    required
                    className="bg-slate-900 border-white/10"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isInspecting || !inspectQuery.trim()}
                  className="sm:w-48 bg-indigo-600 hover:bg-indigo-500"
                >
                  {isInspecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Inspecting...
                    </>
                  ) : (
                    "Inspect API Key"
                  )}
                </Button>
              </form>

              {keyDetails && (
                <div className="border border-white/10 rounded-xl p-6 bg-slate-950/40 backdrop-blur-md grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Key Information</Label>
                      <div className="mt-1.5 flex flex-col gap-1">
                        <div className="font-semibold text-slate-100 text-base">{keyDetails.name}</div>
                        <div className="text-slate-400 font-mono text-sm">Hint: {keyDetails.keyHint}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">ID: {keyDetails.id}</div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Status</Label>
                      <div className="mt-1">
                        {keyDetails.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-400">
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 flex flex-col justify-between">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Company</Label>
                        <div className="text-sm font-semibold text-slate-200 mt-1">{keyDetails.companyName}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">{keyDetails.companyId}</div>
                      </div>
                      <div>
                        <Label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Dates</Label>
                        <div className="text-xs text-slate-300 mt-1 flex flex-col gap-1">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-slate-500" /> Created:{" "}
                            {new Date(keyDetails.createdAt).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-slate-500" /> Expires:{" "}
                            {keyDetails.expiresAt ? new Date(keyDetails.expiresAt).toLocaleDateString() : "Never"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/5 flex justify-end">
                      <Button
                        type="button"
                        onClick={handleToggleActive}
                        disabled={togglingActive}
                        variant={keyDetails.isActive ? "destructive" : "default"}
                        className={
                          keyDetails.isActive
                            ? "bg-rose-600/10 border border-rose-600/20 text-rose-400 hover:bg-rose-600/20"
                            : "bg-emerald-600/10 border border-emerald-600/20 text-emerald-400 hover:bg-emerald-600/20"
                        }
                      >
                        {togglingActive ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...
                          </>
                        ) : keyDetails.isActive ? (
                          "Deactivate API Key"
                        ) : (
                          "Activate API Key"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Referral Rewards Manager */}
          <Card className="border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Gift className="w-5 h-5 text-indigo-400" />
                Referral Rewards Manager
              </CardTitle>
              <CardDescription>
                Audit and revoke referral rewards. Revoking returns both referrer and referred accounts to the FREE tier.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRedemptions ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading redemptions...
                </div>
              ) : redemptions.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  No referral redemptions found in the system.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 font-medium">Referral Info</th>
                        <th className="px-4 py-3 font-medium">Referrer</th>
                        <th className="px-4 py-3 font-medium">Referred User</th>
                        <th className="px-4 py-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {redemptions.map((r) => (
                        <tr key={r.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-indigo-400 font-mono text-xs">{r.referralCode}</div>
                            <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[100px]">{r.id}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {r.proGrantedAt
                                ? new Date(r.proGrantedAt).toLocaleDateString()
                                : new Date(r.createdAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium truncate max-w-[120px]">{r.referrer?.name || "N/A"}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[120px]">{r.referrer?.email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium truncate max-w-[120px]">{r.referredUser?.name || "N/A"}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[120px]">
                              {r.referredUser?.email}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <AlertDialog>
                              <AlertDialogTrigger render={
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={revokingId !== null}
                                  className="text-xs h-8 border-rose-500/20 hover:border-rose-500/50 hover:bg-rose-500/5 text-rose-400"
                                >
                                  {revokingId === r.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                                  )}
                                  Revoke
                                </Button>
                              } />
                              <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-slate-100">Revoke Referral Reward?</AlertDialogTitle>
                                  <AlertDialogDescription className="text-slate-400">
                                    Are you sure you want to revoke this referral reward? Both the referrer and the referred user's accounts, along with their companies, will be downgraded back to the FREE tier.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="flex gap-2 justify-end">
                                  <AlertDialogCancel className="border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRevoke(r.id)}
                                    className="bg-rose-600 hover:bg-rose-700 text-slate-100"
                                  >
                                    Revoke Reward
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
