"use client"

import { useState } from "react"
import { addInteraction } from "@/actions/crm"
import { sendWhatsAppMessage } from "@/actions/integrations"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { 
  FileText, 
  Phone, 
  Mail, 
  MessageSquare, 
  Send, 
  Clock, 
  Calendar,
  Sparkles
} from "lucide-react"

interface Interaction {
  id: string
  customerId: string
  type: string
  content: string
  createdAt: Date
}

interface CrmTimelineProps {
  customerId: string
  initialInteractions: Interaction[]
  openWaEnabled: boolean
}

const TYPE_ICONS: Record<string, any> = {
  NOTE: FileText,
  CALL: Phone,
  EMAIL: Mail,
  WHATSAPP: MessageSquare,
}

const TYPE_COLORS: Record<string, string> = {
  NOTE: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  CALL: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  EMAIL: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  WHATSAPP: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
}

export function CrmTimeline({ customerId, initialInteractions, openWaEnabled }: CrmTimelineProps) {
  const [interactions, setInteractions] = useState<Interaction[]>(initialInteractions)
  const [content, setContent] = useState("")
  const [type, setType] = useState("NOTE")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return

    setLoading(true)
    try {
      if (type === "WHATSAPP") {
        if (!openWaEnabled) {
          toast.error("WhatsApp integration is disabled. Enable it in Settings.")
          setLoading(false)
          return
        }
        const res = await sendWhatsAppMessage(customerId, content)
        if (res.error) {
          toast.error(res.error)
        } else {
          toast.success(res.messageId ? `Sent (ID: ${res.messageId})` : "WhatsApp message sent")
          // Prepend the new interaction locally
          const newInteraction: Interaction = {
            id: Math.random().toString(),
            customerId,
            type: "WHATSAPP",
            content: `WhatsApp message sent: "${content}"`,
            createdAt: new Date(),
          }
          setInteractions((prev) => [newInteraction, ...prev])
          setContent("")
        }
      } else {
        const res = await addInteraction(customerId, type, content)
        if (res.error) {
          toast.error(res.error)
        } else if (res.interaction) {
          toast.success("Interaction logged successfully")
          setInteractions((prev) => [res.interaction as Interaction, ...prev])
          setContent("")
        }
      }
    } catch {
      toast.error("Failed to submit interaction log")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Form Card */}
      <Card className="glass border-white/10 bg-white/2">
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setType("NOTE")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  type === "NOTE"
                    ? "bg-blue-500/15 border-blue-500/30 text-blue-400"
                    : "bg-white/2 border-white/5 text-slate-400 hover:text-slate-200"
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Note
              </button>
              <button
                type="button"
                onClick={() => setType("CALL")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  type === "CALL"
                    ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                    : "bg-white/2 border-white/5 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Phone className="w-3.5 h-3.5" /> Call
              </button>
              <button
                type="button"
                onClick={() => setType("EMAIL")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  type === "EMAIL"
                    ? "bg-purple-500/15 border-purple-500/30 text-purple-400"
                    : "bg-white/2 border-white/5 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Mail className="w-3.5 h-3.5" /> Email
              </button>
              <button
                type="button"
                disabled={!openWaEnabled}
                onClick={() => setType("WHATSAPP")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  type === "WHATSAPP"
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                    : !openWaEnabled
                    ? "opacity-40 cursor-not-allowed border-white/5 text-slate-600 bg-transparent"
                    : "bg-white/2 border-white/5 text-slate-400 hover:text-slate-200"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                {!openWaEnabled && <span className="text-[9px] text-slate-500 font-normal ml-0.5">(Disabled)</span>}
              </button>
            </div>

            <div className="relative">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  type === "WHATSAPP"
                    ? "Type WhatsApp reminder message here (e.g. Hi, friendly reminder that invoice INV-001 is due...)"
                    : "Type note, log details, or summary of customer interactions..."
                }
                className="min-h-[90px] text-sm bg-white/2 border-white/10 placeholder-slate-500 text-slate-100 rounded-xl focus:border-indigo-500/50 focus:ring-0 focus:outline-none resize-none pr-10 pt-2.5"
              />
              <Button
                type="submit"
                disabled={loading || !content.trim()}
                className="absolute bottom-3 right-3 h-8 w-8 p-0 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Timeline List */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/5">
        {interactions.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-white/5 rounded-xl">
            No interactions logged yet. Choose a type above to start logging communications.
          </div>
        ) : (
          interactions.map((interaction) => {
            const Icon = TYPE_ICONS[interaction.type] || FileText
            const colorClass = TYPE_COLORS[interaction.type] || "text-slate-400 bg-slate-500/10 border-slate-500/20"
            const dateStr = new Date(interaction.createdAt).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })

            const isSimulated = interaction.content.startsWith("[Simulated")

            return (
              <div key={interaction.id} className="relative group animate-in fade-in slide-in-from-left-4 duration-300">
                {/* Node Icon */}
                <div className={`absolute -left-[30px] top-1 flex h-6 w-6 items-center justify-center rounded-full border text-xs shadow-md transition-colors ${colorClass}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>

                <div className="bg-white/3 border border-white/5 rounded-xl p-4 space-y-1 hover:border-white/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                      {interaction.type}
                      {isSimulated && (
                        <span className="inline-flex items-center gap-0.5 text-[8px] font-normal text-amber-400 bg-amber-400/10 px-1 py-0.5 rounded border border-amber-400/20 uppercase tracking-normal">
                          <Sparkles className="w-2 h-2 animate-pulse" /> Simulated
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-slate-600" />
                      {dateStr}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed break-words whitespace-pre-wrap">
                    {interaction.content}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
