"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { verifyLlmKey, getReferralRedemptions, revokeReferralRedemption, inspectApiKeyAdmin, toggleApiKeyActiveAdmin } from "@/actions/admin-tools"
import { Wrench, CheckCircle2, XCircle, Loader2, Gift, Trash2, Key, Shield, Calendar } from "lucide-react"
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

export default function AdminToolsPage() {
  const [provider, setProvider] = useState<"openai" | "gemini" | "nvidia">("openai")
  const [apiKey, setApiKey] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null)

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

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setIsVerifying(true)
    setResult(null)

    try {
      const res = await verifyLlmKey(provider, apiKey)
      setResult(res)
    } catch (err: any) {
      setResult({ success: false, error: "An unexpected error occurred." })
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
        setRedemptions(prev => prev.filter(r => r.id !== redemptionId))
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

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Tools</h1>
        <p className="text-gray-500">Platform utilities and testing instruments.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* LLM Key Verifier */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-500" />
                LLM API Key Verifier
              </CardTitle>
              <CardDescription>
                Securely test multi-LLM API keys before adding them to tenant configurations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerify} className="space-y-6">
                <div className="space-y-2">
                  <Label>Select Provider</Label>
                  <Select value={provider} onValueChange={(val: any) => setProvider(val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="gemini">Google Gemini</SelectItem>
                      <SelectItem value="nvidia">Nvidia NIM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    placeholder="Paste API key here..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" disabled={isVerifying || !apiKey.trim()} className="w-full">
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...
                    </>
                  ) : (
                    "Test Key Connection"
                  )}
                </Button>

                {result && (
                  <div className={`mt-4 p-4 rounded-xl border ${result.success ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"}`}>
                    <div className="flex items-start gap-3">
                      {result.success ? <CheckCircle2 className="w-5 h-5 mt-0.5" /> : <XCircle className="w-5 h-5 mt-0.5" />}
                      <div>
                        <h4 className="font-semibold">{result.success ? "Verification Successful" : "Verification Failed"}</h4>
                        <p className="text-sm mt-1">{result.success ? result.message : result.error}</p>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Referral Rewards Manager */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-indigo-500" />
                Referral Rewards Manager
              </CardTitle>
              <CardDescription>
                Monitor and manage active referral redemptions. Revoking will downgrade the referrer, the referred user, and their companies back to FREE.
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
                              {r.proGrantedAt ? new Date(r.proGrantedAt).toLocaleDateString() : new Date(r.createdAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium truncate max-w-[120px]">{r.referrer?.name || "N/A"}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[120px]">{r.referrer?.email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium truncate max-w-[120px]">{r.referredUser?.name || "N/A"}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[120px]">{r.referredUser?.email}</div>
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
                                    className="bg-rose-600 hover:bg-rose-700 text-slate-100 animate-none transition-colors duration-200"
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
        </div>
      </div>

      {/* API Key Inspector & Manager */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-400" />
            API Key Inspector &amp; Manager
          </CardTitle>
          <CardDescription>
            Inspect details, company association, and active status of any API Key in the system by its value, hint, or ID.
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
            <Button type="submit" disabled={isInspecting || !inspectQuery.trim()} className="sm:w-48 bg-indigo-600 hover:bg-indigo-500">
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

                <div className="flex gap-4 items-center">
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
                      <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-slate-500" /> Created: {new Date(keyDetails.createdAt).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-slate-500" /> Expires: {keyDetails.expiresAt ? new Date(keyDetails.expiresAt).toLocaleDateString() : "Never"}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex justify-end">
                  <Button
                    type="button"
                    onClick={handleToggleActive}
                    disabled={togglingActive}
                    variant={keyDetails.isActive ? "destructive" : "default"}
                    className={keyDetails.isActive ? "bg-rose-600/10 border border-rose-600/20 text-rose-400 hover:bg-rose-600/20" : "bg-emerald-600/10 border border-emerald-600/20 text-emerald-400 hover:bg-emerald-600/20"}
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
    </div>
  )
}
