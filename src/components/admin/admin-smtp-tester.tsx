"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { testSmtpDiagnostic } from "@/actions/admin-tools"
import { toast } from "sonner"
import { Mail, CheckCircle2, XCircle, Loader2, Send, Server, ShieldCheck, Zap } from "lucide-react"

export function AdminSmtpTester() {
  const [useSystemDefault, setUseSystemDefault] = useState(true)
  const [host, setHost] = useState("")
  const [port, setPort] = useState("587")
  const [user, setUser] = useState("")
  const [pass, setPass] = useState("")
  const [secure, setSecure] = useState(false)
  const [toEmail, setToEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any | null>(null)

  async function handleTest(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const payload = useSystemDefault
        ? { toEmail: toEmail.trim() || undefined }
        : {
            host: host.trim(),
            port: Number(port) || 587,
            user: user.trim(),
            pass: pass.trim(),
            secure,
            toEmail: toEmail.trim() || undefined,
          }

      const res = await testSmtpDiagnostic(payload)
      setResult(res)
      if (res.success) {
        toast.success(res.mailSent ? "Diagnostic email dispatched successfully!" : "SMTP handshake verified!")
      } else {
        toast.error(res.error || "SMTP verification failed.")
      }
    } catch (err: any) {
      setResult({
        success: false,
        error: err.message || "An unexpected error occurred during SMTP test.",
      })
      toast.error("SMTP verification error.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-indigo-500/20 shadow-lg shadow-indigo-500/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="w-5 h-5 text-indigo-400" />
            SMTP &amp; Email Delivery Diagnostics
          </CardTitle>
          <div className="flex items-center gap-2 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 text-xs font-semibold text-indigo-400">
            <Server className="w-3.5 h-3.5" />
            Outgoing Gateway
          </div>
        </div>
        <CardDescription>
          Inspect SMTP socket connections, TLS handshake negotiations, and dispatch live diagnostic emails.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <form onSubmit={handleTest} className="space-y-5">
          {/* Preset toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-white/5">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold text-slate-200">Use System Default SMTP</Label>
              <p className="text-xs text-muted-foreground">
                Tests credentials loaded in platform environment (<code className="text-amber-400">APP_SMTP_*</code>)
              </p>
            </div>
            <Switch
              checked={useSystemDefault}
              onCheckedChange={(checked) => setUseSystemDefault(checked)}
            />
          </div>

          {!useSystemDefault && (
            <div className="grid gap-4 sm:grid-cols-2 p-4 rounded-xl border border-white/10 bg-slate-950/40">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">SMTP Host</Label>
                <Input
                  placeholder="smtp.example.com"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  required={!useSystemDefault}
                  className="bg-slate-900 border-white/10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">SMTP Port</Label>
                <Input
                  type="number"
                  placeholder="587"
                  value={port}
                  onChange={(e) => {
                    setPort(e.target.value)
                    if (e.target.value === "465") setSecure(true)
                  }}
                  required={!useSystemDefault}
                  className="bg-slate-900 border-white/10"
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-white/10 mt-5">
                <span className="text-xs text-slate-300">SSL/TLS Mode</span>
                <Switch checked={secure} onCheckedChange={setSecure} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">SMTP Username / Email</Label>
                <Input
                  type="text"
                  placeholder="user@example.com"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  required={!useSystemDefault}
                  className="bg-slate-900 border-white/10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">SMTP Password / App Key</Label>
                <Input
                  type="password"
                  placeholder="••••••••••••"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  required={!useSystemDefault}
                  className="bg-slate-900 border-white/10"
                />
              </div>
            </div>
          )}

          {/* Test Destination */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-300">
              Optional: Send Live Test Email To
            </Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="admin@yourdomain.com (Leave blank for connection test only)"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                className="bg-slate-900 border-white/10"
              />
              <Button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Run Diagnostic
                  </>
                )}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              If an email is provided, a verified diagnostic message will be sent through the SMTP server.
            </p>
          </div>
        </form>

        {/* Results Console */}
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
                    {result.success ? "SMTP Gateway Handshake Verified" : "SMTP Verification Failed"}
                  </h4>
                  <p className="text-xs mt-0.5 text-slate-300">
                    {result.message || result.error}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/10 text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block font-semibold">
                      Host
                    </span>
                    <span className="font-mono text-slate-200">
                      {result.host || (useSystemDefault ? "System Default" : "N/A")}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block font-semibold">
                      Port
                    </span>
                    <span className="font-mono text-slate-200">
                      {result.port || (useSystemDefault ? "Default" : "N/A")}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block font-semibold">
                      Handshake Latency
                    </span>
                    <span className="font-mono text-slate-200">
                      {result.handshakeDurationMs ? `${result.handshakeDurationMs} ms` : "N/A"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block font-semibold">
                      Email Dispatched
                    </span>
                    <span className="font-semibold text-slate-200">
                      {result.mailSent ? `Yes (${result.mailDurationMs}ms)` : "No"}
                    </span>
                  </div>
                </div>

                {result.messageId && (
                  <div className="text-[11px] font-mono text-slate-400 bg-black/30 p-2 rounded border border-white/5 break-all">
                    Message-ID: {result.messageId}
                  </div>
                )}

                {result.code && (
                  <div className="text-[11px] font-mono text-rose-300 bg-rose-950/40 p-2 rounded border border-rose-800/30">
                    Error Code: {result.code} {result.command ? `| Command: ${result.command}` : ""}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
