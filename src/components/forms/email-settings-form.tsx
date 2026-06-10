"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { updateEmailSettings, testEmailConnection, sendTestEmail } from "@/actions/email-settings"
import {
  Mail, Server, Lock, Eye, EyeOff, CheckCircle2,
  XCircle, Loader2, Send, Shield, Info,
} from "lucide-react"

interface EmailSettingsFormProps {
  initialData: {
    host: string
    port: number
    username: string
    secure: boolean
    fromEmail?: string | null
    fromName?: string | null
  } | null
}

type MessageState = {
  type: "success" | "error" | "info"
  title: string
  body?: string
} | null

export function EmailSettingsForm({ initialData }: EmailSettingsFormProps) {
  const [isPending, setIsPending] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState<MessageState>(null)
  const [testEmailTo, setTestEmailTo] = useState("")
  const [showSendTest, setShowSendTest] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)
    setMessage(null)
    const form = new FormData(e.currentTarget)
    const result = await updateEmailSettings({
      host: form.get("host"),
      port: form.get("port"),
      username: form.get("username"),
      password: form.get("password"),
      secure: form.get("secure") === "on",
      fromEmail: form.get("fromEmail"),
      fromName: form.get("fromName"),
    })
    setIsPending(false)
    if (result.success) {
      setMessage({ type: "success", title: "Settings saved", body: "Your SMTP configuration has been updated." })
    } else {
      setMessage({ type: "error", title: "Save failed", body: result.error })
    }
  }

  async function handleTest() {
    setIsTesting(true)
    setMessage(null)
    const result = await testEmailConnection()
    setIsTesting(false)
    if (result.success) {
      setMessage({ type: "success", title: "SMTP Connection Verified ✓", body: "Your mail server responded successfully." })
      setShowSendTest(true)
    } else {
      setMessage({ type: "error", title: "Connection Failed", body: result.error })
      setShowSendTest(false)
    }
  }

  async function handleSendTest() {
    if (!testEmailTo) return
    setIsSendingTest(true)
    setMessage(null)
    const result = await sendTestEmail(testEmailTo)
    setIsSendingTest(false)
    if (result.success) {
      setMessage({ type: "success", title: "Test Email Sent ✓", body: `A test email was delivered to ${testEmailTo}. Check your inbox.` })
    } else {
      setMessage({ type: "error", title: "Send Failed", body: result.error })
    }
  }

  const inputClass = "glass border-white/10 focus:border-primary/50 transition-all placeholder:text-muted-foreground/50"

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Status Message */}
      {message && (
        <Alert
          className={`animate-in fade-in duration-300 ${
            message.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10"
              : message.type === "error"
              ? "border-red-500/30 bg-red-500/10"
              : "border-blue-500/30 bg-blue-500/10"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : message.type === "error" ? (
            <XCircle className="h-4 w-4 text-red-400" />
          ) : (
            <Info className="h-4 w-4 text-blue-400" />
          )}
          <AlertTitle className={
            message.type === "success" ? "text-emerald-400" :
            message.type === "error" ? "text-red-400" : "text-blue-400"
          }>
            {message.title}
          </AlertTitle>
          {message.body && (
            <AlertDescription className={`text-sm ${
              message.type === "success" ? "text-emerald-400/80" :
              message.type === "error" ? "text-red-400/80" : "text-blue-400/80"
            }`}>
              {message.body}
            </AlertDescription>
          )}
        </Alert>
      )}

      {/* ── SMTP Server ── */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Server className="h-3.5 w-3.5" /> SMTP Server
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="host" className="text-sm font-medium">
              Host <span className="text-red-400">*</span>
            </Label>
            <Input
              id="host"
              name="host"
              className={inputClass}
              defaultValue={initialData?.host ?? ""}
              placeholder="smtp.gmail.com"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="port" className="text-sm font-medium">
              Port <span className="text-red-400">*</span>
            </Label>
            <Input
              id="port"
              name="port"
              type="number"
              className={inputClass}
              defaultValue={initialData?.port ?? 587}
              required
            />
          </div>
        </div>

        {/* SSL/TLS toggle */}
        <label className="flex items-center gap-2.5 cursor-pointer group w-fit">
          <div className="relative">
            <input
              type="checkbox"
              name="secure"
              defaultChecked={initialData?.secure ?? true}
              className="sr-only peer"
              id="secure-toggle"
            />
            <div className="w-9 h-5 rounded-full border border-white/10 bg-white/5 peer-checked:bg-primary/60 transition-colors" />
            <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white/60 peer-checked:translate-x-4 peer-checked:bg-white transition-all" />
          </div>
          <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
            Use SSL/TLS
          </span>
          <Shield className="h-3.5 w-3.5 text-emerald-400" />
        </label>
      </div>

      <Separator className="bg-white/8" />

      {/* ── Authentication ── */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5" /> Authentication
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-sm font-medium">
              Username / Email <span className="text-red-400">*</span>
            </Label>
            <Input
              id="username"
              name="username"
              className={inputClass}
              defaultValue={initialData?.username ?? ""}
              placeholder="you@gmail.com"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium flex items-center justify-between">
              <span>
                Password
                {initialData && (
                  <span className="text-muted-foreground text-xs font-normal ml-1">(leave blank to keep existing)</span>
                )}
              </span>
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                className={`${inputClass} pr-10`}
                placeholder={initialData ? "••••••••" : "App password or SMTP password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Separator className="bg-white/8" />

      {/* ── Sender Info ── */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5" /> Sender Details
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="fromEmail" className="text-sm font-medium">From Email</Label>
            <Input
              id="fromEmail"
              name="fromEmail"
              type="email"
              className={inputClass}
              defaultValue={initialData?.fromEmail ?? ""}
              placeholder="invoices@yourbusiness.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fromName" className="text-sm font-medium">From Name</Label>
            <Input
              id="fromName"
              name="fromName"
              className={inputClass}
              defaultValue={initialData?.fromName ?? ""}
              placeholder="Your Business Name"
            />
          </div>
        </div>
      </div>

      {/* ── Action Buttons ── */}
      <div className="flex flex-wrap gap-3 pt-2">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-lg gap-1.5"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPending ? "Saving..." : "Save Settings"}
        </Button>

        <Button
          type="button"
          variant="outline"
          disabled={isTesting || !initialData}
          onClick={handleTest}
          className="glass border-white/10 hover:bg-white/8 gap-1.5"
          title={!initialData ? "Save settings first" : "Verify SMTP connection"}
        >
          {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
          {isTesting ? "Verifying..." : "Test Connection"}
        </Button>
      </div>

      {/* ── Send Test Email ── */}
      {showSendTest && (
        <div className="glass glass-card border-white/10 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Send className="h-3.5 w-3.5 text-violet-400" />
            Send a real test email to verify delivery
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="email"
              placeholder="recipient@example.com"
              value={testEmailTo}
              onChange={(e) => setTestEmailTo(e.target.value)}
              className={`${inputClass} flex-1`}
            />
            <Button
              type="button"
              onClick={handleSendTest}
              disabled={isSendingTest || !testEmailTo}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white gap-1.5 shrink-0 w-full sm:w-auto"
            >
              {isSendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isSendingTest ? "Sending..." : "Send Test"}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            A branded test email will be sent from your configured SMTP server.
          </p>
        </div>
      )}
    </form>
  )
}
