"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { verifyLlmKey, getReferralRedemptions, revokeReferralRedemption } from "@/actions/admin-tools"
import { Wrench, CheckCircle2, XCircle, Loader2, Gift, Trash2 } from "lucide-react"
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
    </div>
  )
}
