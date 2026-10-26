"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Sparkles,
  Send,
  Workflow,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Filter,
  Layers,
  Clock,
  Briefcase,
  Mail,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"
import { askCrmAiAction, confirmCrmAiActionPlan } from "@/actions/crm-ai"
import type { AICrmOperationResult, ProposedAIWorkflow } from "@/ai/crm-assistant"

interface ChatMessage {
  id: string
  sender: "user" | "assistant"
  text: string
  crmResult?: AICrmOperationResult
}

export function CrmAiChat() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Hello! I am your CRM AI Copilot. I can generate custom sales workflows, analyze stalled pipeline deals, draft follow-up emails, and assist with data entry. Try asking one of the suggested prompts below.",
    }
  ])
  const [input, setInput] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [executingPlanId, setExecutingPlanId] = React.useState<string | null>(null)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  const quickPrompts = [
    "Create a workflow for new leads from Bengaluru. Assign them to the sales team, create a follow-up task for tomorrow, and draft a welcome email.",
    "Show deals that may close this month and highlight stalled deals.",
    "Draft a follow-up email for a high-value proposal.",
    "Create a task for overdue client follow-ups."
  ]

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (textToSend?: string) => {
    const prompt = (textToSend || input).trim()
    if (!prompt || loading) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: prompt,
    }

    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setLoading(true)

    try {
      const res = await askCrmAiAction(prompt)
      if (res.error) throw new Error(res.error)

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "assistant",
        text: res.data?.assistantReply || "Here is what I found for your request.",
        crmResult: res.data,
      }

      setMessages((prev) => [...prev, assistantMsg])
    } catch (err: any) {
      toast.error(err.message || "Failed to process query")
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "assistant",
          text: `I encountered an issue processing your request: ${err.message}`,
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handlePublishProposedWorkflow = async (msgId: string, wf: ProposedAIWorkflow) => {
    setExecutingPlanId(msgId)
    try {
      const res = await confirmCrmAiActionPlan({
        actionType: "PUBLISH_WORKFLOW",
        payload: wf,
      })
      if (res.error) throw new Error(res.error)
      toast.success((res as any).message || `Workflow "${wf.name}" published!`)

      setMessages((prev) => [
        ...prev,
        {
          id: `confirm-${Date.now()}`,
          sender: "assistant",
          text: `Success! Workflow "${wf.name}" has been published to your Workflow Studio and is now actively evaluating events.`,
        }
      ])
    } catch (err: any) {
      toast.error(err.message || "Failed to publish workflow")
    } finally {
      setExecutingPlanId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Safe Execution Sequence Alert ── */}
      <div className="p-3.5 rounded-2xl glass border border-emerald-500/20 bg-emerald-500/5 flex items-start gap-3 text-xs">
        <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-foreground">Safe AI Execution Sequence Active</span>
          <p className="text-muted-foreground mt-0.5">
            Requests are scoped strictly to your workspace, validated against approved triggers &amp; actions, and require explicit confirmation before publishing or altering records.
          </p>
        </div>
      </div>

      {/* ── Chat Messages Container ── */}
      <Card className="glass border-white/10 shadow-sm rounded-2xl min-h-[500px] max-h-[680px] flex flex-col justify-between overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-none shadow-md shadow-emerald-500/20"
                    : "glass border border-white/10 text-foreground rounded-bl-none shadow-sm"
                }`}
              >
                <p className="whitespace-pre-line">{msg.text}</p>

                {/* ── Proposed AI Workflow Interactive Card ── */}
                {msg.crmResult?.proposedWorkflow && (
                  <div className="mt-4 p-3.5 rounded-xl bg-background/80 border border-indigo-500/30 text-foreground space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-400">
                        <Workflow className="h-4 w-4" />
                        <span>Proposed Automation Workflow (Draft)</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] border-indigo-500/30 text-indigo-400">
                        Needs Confirmation
                      </Badge>
                    </div>

                    <div className="space-y-2 text-xs">
                      {/* Trigger */}
                      <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                        <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider flex items-center gap-1">
                          <Zap className="h-3 w-3" /> Trigger
                        </span>
                        <p className="font-semibold text-foreground mt-0.5">
                          {msg.crmResult.proposedWorkflow.trigger.label}
                        </p>
                      </div>

                      {/* Conditions */}
                      <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                        <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider flex items-center gap-1">
                          <Filter className="h-3 w-3" /> Conditions
                        </span>
                        {msg.crmResult.proposedWorkflow.conditions.map((c, i) => (
                          <p key={i} className="font-semibold text-foreground mt-0.5">
                            Lead region matches &ldquo;{c.value}&rdquo;
                          </p>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1">
                          <Layers className="h-3 w-3" /> Actions
                        </span>
                        <ul className="list-disc pl-4 space-y-0.5 mt-0.5 text-foreground">
                          {msg.crmResult.proposedWorkflow.actions.map((a, i) => (
                            <li key={i}>{a.label}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Publish Action Button */}
                    <div className="pt-2 flex justify-end">
                      <Button
                        size="sm"
                        disabled={executingPlanId === msg.id}
                        onClick={() => handlePublishProposedWorkflow(msg.id, msg.crmResult!.proposedWorkflow!)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 rounded-xl shadow-md shadow-indigo-500/20"
                      >
                        {executingPlanId === msg.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        <span>Publish Workflow</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── Sales Intelligence Card ── */}
                {msg.crmResult?.salesIntelligence && (
                  <div className="mt-4 p-3.5 rounded-xl bg-background/80 border border-amber-500/30 text-foreground space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-amber-400">
                      <Briefcase className="h-4 w-4" />
                      <span>Pipeline Stalled Deals Intelligence</span>
                    </div>

                    <div className="space-y-1.5">
                      {msg.crmResult.salesIntelligence.stalledDeals.map((stalled, i) => (
                        <div key={i} className="p-2 rounded-lg bg-white/5 border border-white/10 text-xs">
                          <div className="flex justify-between font-bold text-foreground">
                            <span>{stalled.title}</span>
                            <span className="text-amber-400">₹{stalled.value.toLocaleString("en-IN")}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{stalled.riskReason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
              <Sparkles className="h-4 w-4 animate-spin text-emerald-400" />
              <span>Analyzing CRM records and constructing safe response...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        {/* ── Input & Prompt Suggestions ── */}
        <div className="p-3 border-t border-white/8 space-y-3 bg-white/2">
          {/* Quick Prompts Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(p)}
                className="shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-muted-foreground hover:text-foreground transition-all truncate max-w-xs"
                title={p}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Ask questions or type an instruction (e.g. 'Create a workflow for new leads from Bengaluru...')"
              className="min-h-[44px] max-h-24 resize-none text-xs rounded-xl glass border-white/10"
              rows={1}
            />
            <Button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="h-11 w-11 shrink-0 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-500/20"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
