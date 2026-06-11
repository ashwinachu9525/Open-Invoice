"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { verifyLlmKey } from "@/actions/admin-tools"
import { Wrench, CheckCircle2, XCircle, Loader2 } from "lucide-react"

export default function AdminToolsPage() {
  const [provider, setProvider] = useState<"openai" | "gemini" | "nvidia">("openai")
  const [apiKey, setApiKey] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null)

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

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Tools</h1>
        <p className="text-gray-500">Platform utilities and testing instruments.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-500" />
            LLM API Key Verifier
          </CardTitle>
          <CardDescription>
            Securely test multi-LLM API keys (OpenAI, Gemini, Nvidia) before adding them to tenant configurations. Keys are not logged or stored.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-6 max-w-md">
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
  )
}
