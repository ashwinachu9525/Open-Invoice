"use client"

import * as React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import {
  Sparkles, Send, Plus, MessageSquare, Trash2, CheckCircle2,
  Download, Edit, BarChart3, AlertTriangle, Users, Mail,
  FileText, Zap, Copy, RefreshCw
} from "lucide-react"
import {
  getChatSessions, getChatSession, createChatSession,
  addMessageToSession, deleteChatSession, appendToLastAssistantMessage,
  renameChatSession,
} from "@/actions/ai-chat"
import { createInvoice, getNextInvoiceNumber } from "@/actions/invoice"
import { getCustomers } from "@/actions/customer"
import { toast } from "sonner"
import Link from "next/link"
import { SendEmailButton } from "@/components/invoices/send-email-button"
import { UpgradeModal } from "@/components/modals/upgrade-modal"

// ── Types ──────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
}

// ── Markdown renderer ──────────────────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n")
  const elements: React.ReactNode[] = []
  let i = 0

  function inlineFormat(s: string): React.ReactNode {
    const parts = s.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g)
    return parts.map((p, idx) => {
      if (p.startsWith("**") && p.endsWith("**")) return <strong key={idx}>{p.slice(2, -2)}</strong>
      if (p.startsWith("*") && p.endsWith("*")) return <em key={idx}>{p.slice(1, -1)}</em>
      if (p.startsWith("`") && p.endsWith("`")) return <code key={idx} className="bg-white/10 px-1 py-0.5 rounded text-xs font-mono">{p.slice(1, -1)}</code>
      return p
    })
  }

  while (i < lines.length) {
    const line = lines[i]

    // Heading
    if (line.startsWith("## ")) {
      elements.push(<h3 key={i} className="font-bold text-sm text-primary mt-3 mb-1">{line.slice(3)}</h3>)
      i++; continue
    }
    if (line.startsWith("# ")) {
      elements.push(<h2 key={i} className="font-bold text-base mt-3 mb-1">{line.slice(2)}</h2>)
      i++; continue
    }

    // Table
    if (line.startsWith("|") && lines[i + 1]?.startsWith("|---")) {
      const headers = line.split("|").filter(Boolean).map(h => h.trim())
      i += 2 // skip header + separator
      const rows: string[][] = []
      while (i < lines.length && lines[i].startsWith("|")) {
        rows.push(lines[i].split("|").filter(Boolean).map(c => c.trim()))
        i++
      }
      elements.push(
        <div key={`tbl-${i}`} className="overflow-x-auto my-2">
          <table className="text-xs w-full border-collapse">
            <thead>
              <tr>{headers.map((h, j) => <th key={j} className="border border-white/20 bg-white/10 px-2 py-1 text-left font-semibold">{inlineFormat(h)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci} className="border border-white/10 px-2 py-1">{inlineFormat(c)}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    // Blockquote
    if (line.startsWith("> ")) {
      elements.push(<blockquote key={i} className="border-l-2 border-primary/50 pl-3 text-muted-foreground italic text-xs my-1">{inlineFormat(line.slice(2))}</blockquote>)
      i++; continue
    }

    // Bullet list
    if (line.match(/^[\-\*] /)) {
      const bullets: string[] = []
      while (i < lines.length && lines[i].match(/^[\-\*] /)) {
        bullets.push(lines[i].slice(2))
        i++
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-0.5 my-1 text-sm">
          {bullets.map((b, bi) => <li key={bi}>{inlineFormat(b)}</li>)}
        </ul>
      )
      continue
    }

    // Numbered list
    if (line.match(/^\d+\. /)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(lines[i].replace(/^\d+\. /, ""))
        i++
      }
      elements.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside space-y-0.5 my-1 text-sm">
          {items.map((it, ii) => <li key={ii}>{inlineFormat(it)}</li>)}
        </ol>
      )
      continue
    }

    // Blank line
    if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />)
      i++; continue
    }

    // Paragraph
    elements.push(<p key={i} className="text-sm leading-relaxed">{inlineFormat(line)}</p>)
    i++
  }

  return <div className="space-y-0.5">{elements}</div>
}

// ── Quick command chips ────────────────────────────────────────────────────
const QUICK_CHIPS = [
  { icon: FileText,    label: "New Invoice",        prompt: "Create a new invoice" },
  { icon: BarChart3,   label: "Business Summary",   prompt: "Give me a quick summary of my business this month including revenue, outstanding, and overdue amounts" },
  { icon: AlertTriangle, label: "Overdue Invoices", prompt: "Which invoices are currently overdue and by how much?" },
  { icon: Users,       label: "Top Customers",      prompt: "Who are my top customers by revenue?" },
  { icon: Mail,        label: "Reminder Email",     prompt: "Draft a professional payment reminder email for an overdue invoice" },
]

// ── Streaming reader ───────────────────────────────────────────────────────
async function streamChat(
  messages: ChatMessage[],
  sessionId: string,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (e: string) => void
) {
  const res = await fetch("/api/ai/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, sessionId }),
  })

  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({}))
    onError(err.error ?? "Stream failed")
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue
      const payload = line.slice(6)
      if (payload === "[DONE]") { onDone(); return }
      try {
        const chunk = JSON.parse(payload)
        if (typeof chunk === "string") onChunk(chunk)
        else if (chunk?.error) onError(chunk.error)
      } catch { /* ignore malformed */ }
    }
  }
  onDone()
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function AIChatPage() {
  const [sessions, setSessions]             = useState<any[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages]             = useState<ChatMessage[]>([])
  const [input, setInput]                   = useState("")
  const [isStreaming, setIsStreaming]        = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [customers, setCustomers]           = useState<any[]>([])
  const [showUpgrade, setShowUpgrade]       = useState(false)
  const [upgradeReason, setUpgradeReason]   = useState("")
  const [draftState, setDraftState]         = useState<{ clientId?: string; clientName?: string }>({})
  const [isFirstReply, setIsFirstReply]     = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef    = useRef<HTMLTextAreaElement>(null)
  const streamingRef   = useRef("")

  useEffect(() => {
    loadSessions()
    loadCustomers()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingContent])

  async function loadCustomers() {
    const custs = await getCustomers({ limit: 1000 })
    setCustomers(custs.customers)
  }

  async function loadSessions() {
    const s = await getChatSessions()
    setSessions(s)
    if (s.length > 0) {
      loadSession(s[0].id)
    } else {
      handleNewChat()
    }
  }

  async function loadSession(id: string) {
    setActiveSessionId(id)
    setDraftState({})
    setStreamingContent("")
    setIsFirstReply(false)
    const session = await getChatSession(id)
    if (session) {
      setMessages(session.messages.map((m: any) => ({ role: m.role, content: m.content })))
    }
  }

  async function handleNewChat() {
    const s = await createChatSession("New Chat")
    if (s && "error" in s) {
      setUpgradeReason(s.error as string)
      setShowUpgrade(true)
      return
    }
    if (s && !("error" in s)) {
      setSessions(prev => [s as any, ...prev])
      setActiveSessionId(s.id)
      setMessages([])
      setDraftState({})
      setStreamingContent("")
      setIsFirstReply(true)
    }
  }

  async function handleDeleteChat(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    await deleteChatSession(id)
    setSessions(prev => prev.filter(s => s.id !== id))
    if (activeSessionId === id) {
      setMessages([])
      setActiveSessionId(null)
      const remaining = sessions.filter(s => s.id !== id)
      if (remaining.length > 0) loadSession(remaining[0].id)
    }
  }

  // ── Auto-title helper ────────────────────────────────────────────────────
  async function autoTitle(sessionId: string, firstUserMsg: string) {
    // Generate a short title from the first user message (no LLM call — just truncate smartly)
    const title = firstUserMsg
      .replace(/create|invoice|draft|generate|make/gi, "")
      .trim()
      .split(/\s+/)
      .slice(0, 5)
      .join(" ")
      || firstUserMsg.slice(0, 40)
    await renameChatSession(sessionId, title || firstUserMsg.slice(0, 40))
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title } : s))
  }

  // ── Core message processor ───────────────────────────────────────────────
  async function processMessage(userMsg: string) {
    if (!activeSessionId || isStreaming) return

    // Client selection from wizard
    const lastMsg = messages[messages.length - 1]
    if (lastMsg?.content === "SELECT_CLIENT") {
      const matched = customers.find(c =>
        userMsg.toLowerCase().includes(c.name?.toLowerCase()) ||
        (c.companyName && userMsg.toLowerCase().includes(c.companyName.toLowerCase()))
      )
      if (matched) {
        setDraftState({ clientId: matched.id, clientName: matched.name || matched.companyName })
        setMessages(prev => [...prev, { role: "user", content: userMsg }])
        await addMessageToSession(activeSessionId, "user", userMsg)
        await sendToAI([...messages, { role: "user", content: `Selected client: ${matched.name || matched.companyName} (ID: ${matched.id}). Now please help me create the invoice.` }])
        return
      }
    }

    const newMessages = [...messages, { role: "user" as const, content: userMsg }]
    setMessages(newMessages)
    await addMessageToSession(activeSessionId, "user", userMsg)

    // Auto-title on first message
    if (isFirstReply && messages.length === 0) {
      autoTitle(activeSessionId, userMsg)
    }

    await sendToAI(newMessages)
  }

  async function sendToAI(msgHistory: ChatMessage[]) {
    if (!activeSessionId) return
    setIsStreaming(true)
    setStreamingContent("")
    streamingRef.current = ""

    try {
      await streamChat(
        msgHistory,
        activeSessionId,
        (chunk) => {
          streamingRef.current += chunk
          setStreamingContent(streamingRef.current)
        },
        async () => {
          // Done
          const finalContent = streamingRef.current
          setStreamingContent("")
          setMessages(prev => [...prev, { role: "assistant", content: finalContent }])
          setIsFirstReply(false)
          await addMessageToSession(activeSessionId!, "assistant", finalContent)
          setIsStreaming(false)
        },
        (err) => {
          toast.error(err)
          setStreamingContent("")
          setIsStreaming(false)
        }
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Stream failed")
      setStreamingContent("")
      setIsStreaming(false)
    }
  }

  async function handleSend() {
    const msg = input.trim()
    if (!msg || !activeSessionId || isStreaming) return
    setInput("")
    // Auto-grow textarea reset
    if (textareaRef.current) textareaRef.current.style.height = "auto"
    await processMessage(msg)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    // Auto-grow
    e.target.style.height = "auto"
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`
  }

  function selectClient(id: string, name: string) {
    setDraftState({ clientId: id, clientName: name })
    setMessages(prev => [...prev, { role: "assistant", content: `✅ Selected **${name}**. Now tell me the invoice details — services, quantities, rates, and GST%.` }])
  }

  async function handleGenerateInvoice(jsonString: string) {
    try {
      const data = JSON.parse(jsonString)
      const nextInvNumber = await getNextInvoiceNumber()

      // Support both multi-item (data.items[]) and legacy single-item format
      const items = Array.isArray(data.items) && data.items.length > 0
        ? data.items.map((it: any) => ({
            description:   it.description,
            hsnSac:        it.hsnSac ?? null,
            quantity:      Number(it.quantity) || 1,
            unitPrice:     Number(it.rate ?? it.unitPrice) || 0,
            discount:      Number(it.discount) || 0,
            taxPercentage: Number(it.gstPercent ?? it.taxPercentage) || 18,
          }))
        : [{
            description:   data.description ?? "Service",
            hsnSac:        data.hsnSac ?? null,
            quantity:      Number(data.quantity) || 1,
            unitPrice:     Number(data.rate) || 0,
            discount:      0,
            taxPercentage: Number(data.gstPercent) || 18,
          }]

      const payload = {
        customerId:    data.clientId,
        invoiceNumber: nextInvNumber,
        date:          new Date(data.invoiceDate ?? new Date()),
        dueDate:       new Date(data.dueDate ?? new Date(Date.now() + 30 * 864e5)),
        currency:      "INR",
        notes:         data.notes ?? "Generated by AI Assistant",
        items,
        tdsPercentage: data.tdsPercentage ?? 0,
        themeColor:    data.themeColor ?? "#1e40af",
        themeFont:     "Helvetica",
      }

      const res = await createInvoice(payload)
      if (res.error) throw new Error(res.error)

      if (activeSessionId) {
        const tag = `\n\n[GENERATED_INVOICE:${nextInvNumber}:${res.invoiceId}]`
        await appendToLastAssistantMessage(activeSessionId, tag)
        setMessages(prev => {
          const msgs = [...prev]
          for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].role === "assistant") {
              msgs[i] = { ...msgs[i], content: msgs[i].content + tag }
              break
            }
          }
          return msgs
        })
      }
      toast.success(`Invoice #${nextInvNumber} created successfully!`)
    } catch (e) {
      toast.error("Failed to create invoice: " + (e instanceof Error ? e.message : "Unknown error"))
    }
  }

  // ── Message renderer ───────────────────────────────────────────────────
  function renderMessageContent(content: string) {
    // Special UI states
    if (content === "SELECT_CLIENT") {
      return (
        <div className="space-y-3 min-w-[240px]">
          <p className="font-medium text-blue-200 text-sm">Please select a client:</p>
          <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
            {customers.map(c => (
              <button
                key={c.id}
                onClick={() => selectClient(c.id, c.name || c.companyName)}
                className="text-left px-3 py-2 text-sm rounded-lg bg-white/5 hover:bg-primary/20 border border-white/10 hover:border-primary/30 transition-colors truncate"
              >
                {c.name || c.companyName}
                {c.companyName && c.name !== c.companyName && <span className="text-muted-foreground ml-2 text-xs">{c.companyName}</span>}
              </button>
            ))}
            {customers.length === 0 && (
              <p className="text-xs text-muted-foreground">No clients found. Create one in the Customers section first.</p>
            )}
          </div>
        </div>
      )
    }

    // JSON invoice payload
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/)
    if (jsonMatch) {
      const before  = content.substring(0, jsonMatch.index ?? 0)
      const jsonStr = jsonMatch[1]
      const genMatch = content.match(/\[GENERATED_INVOICE:(.*?):(.*?)]/)
      const isGenerated     = !!genMatch
      const generatedInvNum = genMatch?.[1] ?? ""
      const generatedInvId  = genMatch?.[2] ?? ""

      let parsedItems: any[] = []
      try {
        const parsed = JSON.parse(jsonStr)
        parsedItems = Array.isArray(parsed.items) ? parsed.items : [{ description: parsed.description, quantity: parsed.quantity, rate: parsed.rate, gstPercent: parsed.gstPercent }]
      } catch {}

      return (
        <div className="space-y-3">
          {before && <div className="text-sm">{renderMarkdown(before)}</div>}
          <Card className={`border ${isGenerated ? "bg-emerald-500/5 border-emerald-500/20" : "bg-primary/5 border-primary/20"}`}>
            <CardContent className="p-4 flex flex-col gap-3">
              <div className={`flex items-center gap-2 font-semibold text-sm ${isGenerated ? "text-emerald-400" : "text-primary"}`}>
                <CheckCircle2 className="h-4 w-4" />
                {isGenerated ? `Invoice #${generatedInvNum} Created!` : "Invoice Ready to Generate"}
              </div>

              {/* Line items preview */}
              {parsedItems.length > 0 && !isGenerated && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left pb-1 text-muted-foreground font-medium">Item</th>
                        <th className="text-right pb-1 text-muted-foreground font-medium">Qty</th>
                        <th className="text-right pb-1 text-muted-foreground font-medium">Rate</th>
                        <th className="text-right pb-1 text-muted-foreground font-medium">GST</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {parsedItems.map((it: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-1 pr-2 max-w-[180px] truncate">{it.description}</td>
                          <td className="py-1 text-right">{it.quantity}</td>
                          <td className="py-1 text-right">₹{Number(it.rate ?? it.unitPrice ?? 0).toLocaleString("en-IN")}</td>
                          <td className="py-1 text-right">{it.gstPercent ?? it.taxPercentage ?? 18}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {isGenerated ? (
                <div className="flex gap-2 flex-wrap">
                  <Link href={`/api/invoices/${generatedInvId}/pdf`} target="_blank">
                    <Button variant="outline" size="sm" className="glass border-white/10 hover:bg-white/8 gap-1.5 text-xs h-8">
                      <Download className="h-3.5 w-3.5" /> PDF
                    </Button>
                  </Link>
                  <SendEmailButton invoiceId={generatedInvId} />
                  <Link href={`/invoices/${generatedInvId}/edit`}>
                    <Button variant="outline" size="sm" className="glass border-white/10 hover:bg-white/8 gap-1.5 text-xs h-8">
                      <Edit className="h-3.5 w-3.5" /> Edit
                    </Button>
                  </Link>
                </div>
              ) : (
                <Button onClick={() => handleGenerateInvoice(jsonStr)} size="sm" className="self-start gap-1.5 h-8 text-xs">
                  <Zap className="h-3.5 w-3.5" /> Generate Invoice Now
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    // Strip GENERATED_INVOICE token from plain messages
    const clean = content.replace(/\[GENERATED_INVOICE:.*?\]/g, "").trim()
    return renderMarkdown(clean)
  }

  // ── Avatar ────────────────────────────────────────────────────────────
  const AIAvatar = () => (
    <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/20">
      <Sparkles className="h-4 w-4 text-white" />
    </div>
  )

  const showChips = messages.length === 0 && !isStreaming

  return (
    <div className="flex flex-col md:flex-row h-[calc(100dvh-7rem)] md:h-[calc(100vh-8rem)] gap-4 md:gap-5">

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <div className="w-full md:w-60 flex-shrink-0 flex-col gap-3 hidden md:flex">
        <Button
          onClick={handleNewChat}
          className="w-full justify-start gap-2 bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 hover:border-primary/40 transition-all"
          variant="ghost"
        >
          <Plus className="h-4 w-4" /> New Chat
        </Button>

        <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
          {sessions.map(s => (
            <div
              key={s.id}
              onClick={() => loadSession(s.id)}
              className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-sm transition-all ${
                activeSessionId === s.id
                  ? "bg-primary/15 text-primary border border-primary/20"
                  : "hover:bg-white/5 text-muted-foreground border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate text-xs">{s.title}</span>
              </div>
              <button
                onClick={(e) => handleDeleteChat(s.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all shrink-0"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main Chat ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col glass border border-white/10 rounded-2xl overflow-hidden relative">

        {/* Header */}
        <div className="px-4 md:px-5 py-3 border-b border-white/10 bg-black/30 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">AI Invoice Assistant</h2>
              <p className="text-[10px] text-muted-foreground">Extreme Performance Mode · Streaming</p>
            </div>
          </div>

          {/* Mobile controls */}
          <div className="flex items-center gap-2 md:hidden">
            <Sheet>
              <SheetTrigger render={
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                  <MessageSquare className="h-3.5 w-3.5 mr-1" /> History
                </Button>
              } />
              <SheetContent side="left" className="w-60 glass border-white/10 p-4 flex flex-col gap-3 text-white">
                <h3 className="font-semibold text-sm">Chat History</h3>
                <SheetClose render={
                  <Button onClick={handleNewChat} className="w-full justify-start gap-2" variant="outline">
                    <Plus className="h-4 w-4" /> New Chat
                  </Button>
                } />
                <div className="flex-1 overflow-y-auto space-y-1">
                  {sessions.map(s => (
                    <SheetClose key={s.id} render={
                      <div
                        onClick={() => loadSession(s.id)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl cursor-pointer text-xs transition-all ${activeSessionId === s.id ? "bg-primary/15 text-primary" : "hover:bg-white/5 text-muted-foreground"}`}
                      />
                    }>
                      <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{s.title}</span>
                    </SheetClose>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
            <Button onClick={handleNewChat} variant="ghost" size="sm" className="h-8 px-2 text-xs">
              <Plus className="h-3 w-3 mr-1" /> New
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-5">

          {/* Empty state */}
          {messages.length === 0 && !isStreaming && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-8">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/20 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-violet-400" />
              </div>
              <div>
                <h3 className="font-semibold text-base">What can I help with?</h3>
                <p className="text-sm text-muted-foreground mt-1">Create invoices, analyze your business, or ask anything.</p>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && <AIAvatar />}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-white/5 border border-white/10 rounded-tl-sm"
              }`}>
                {renderMessageContent(m.content)}
              </div>
            </div>
          ))}

          {/* Live streaming bubble */}
          {isStreaming && (
            <div className="flex gap-3 justify-start">
              <AIAvatar />
              <div className="max-w-[80%] bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 text-sm">
                {streamingContent
                  ? <>{renderMarkdown(streamingContent)}<span className="inline-block w-1.5 h-4 bg-primary/70 rounded-sm ml-0.5 animate-pulse align-middle" /></>
                  : (
                    <div className="flex items-center gap-1.5 py-1">
                      <div className="h-2 w-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="h-2 w-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="h-2 w-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  )
                }
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-3 md:p-4 bg-black/30 border-t border-white/10 flex flex-col gap-3 shrink-0">

          {/* Quick chips */}
          {showChips && (
            <div className="flex flex-wrap gap-2">
              {QUICK_CHIPS.map(chip => (
                <button
                  key={chip.label}
                  id={`chip-${chip.label.toLowerCase().replace(/\s+/g, "-")}`}
                  onClick={() => processMessage(chip.prompt)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border border-white/10 bg-white/5 hover:bg-primary/10 hover:border-primary/30 text-muted-foreground hover:text-foreground transition-all"
                >
                  <chip.icon className="h-3 w-3" />
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          {/* Text input */}
          <div className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              id="ai-chat-input"
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Describe invoice, ask about business, or request a draft email… (Enter to send, Shift+Enter for newline)"
              className="flex-1 bg-black/40 border-white/15 resize-none min-h-[44px] max-h-[160px] text-sm rounded-xl focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
              rows={1}
              disabled={isStreaming || !activeSessionId}
            />
            <Button
              id="ai-send-btn"
              type="button"
              onClick={handleSend}
              disabled={isStreaming || !activeSessionId || !input.trim()}
              className="h-11 w-11 shrink-0 p-0 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 shadow-lg shadow-primary/20"
            >
              {isStreaming
                ? <RefreshCw className="h-4 w-4 animate-spin" />
                : <Send className="h-4 w-4" />
              }
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            AI can make mistakes · Always verify invoice details before sending
          </p>
        </div>
      </div>

      <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} reason={upgradeReason} />
    </div>
  )
}
