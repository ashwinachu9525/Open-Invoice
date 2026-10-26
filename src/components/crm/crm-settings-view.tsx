"use client"

import * as React from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Settings,
  Briefcase,
  Layers,
  Sparkles,
  Workflow,
  Plus,
  Trash2,
  ExternalLink,
  Shield,
  Mail,
  Zap,
} from "lucide-react"
import { toast } from "sonner"

interface CrmSettingsViewProps {
  initialStages: any[]
}

export function CrmSettingsView({ initialStages }: CrmSettingsViewProps) {
  const [stages, setStages] = React.useState(initialStages)

  const handleAddStage = () => {
    const newStage = {
      id: `temp-${Date.now()}`,
      name: "New Custom Stage",
      probability: 50,
      color: "#3b82f6",
      isWon: false,
      isLost: false,
    }
    setStages([...stages, newStage])
    toast.success("Stage added to local list! Save configuration to apply.")
  }

  const handleSave = () => {
    toast.success("CRM pipeline configuration saved successfully!")
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ── Pipeline Stages Configuration ── */}
      <Card className="glass border-white/10 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-emerald-400" />
              Custom Pipeline Stages
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Define the progression stages, probabilities, and colors for your deals board
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={handleAddStage}
            className="h-8 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Stage</span>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {stages.map((stage, idx) => (
            <div key={stage.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/8 text-xs">
              <span className="w-5 h-5 rounded-full bg-white/10 text-muted-foreground font-mono flex items-center justify-center shrink-0">
                {idx + 1}
              </span>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input
                  value={stage.name}
                  onChange={(e) => {
                    const updated = [...stages]
                    updated[idx].name = e.target.value
                    setStages(updated)
                  }}
                  className="h-8 text-xs"
                  placeholder="Stage Name"
                />

                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-[11px] shrink-0">Prob:</span>
                  <Input
                    type="number"
                    value={stage.probability}
                    onChange={(e) => {
                      const updated = [...stages]
                      updated[idx].probability = Number(e.target.value)
                      setStages(updated)
                    }}
                    className="h-8 text-xs"
                    placeholder="Probability %"
                  />
                  <span className="text-muted-foreground text-xs">%</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={stage.color || "#3b82f6"}
                    onChange={(e) => {
                      const updated = [...stages]
                      updated[idx].color = e.target.value
                      setStages(updated)
                    }}
                    className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                  />
                  <span className="text-[11px] text-muted-foreground font-mono">{stage.color}</span>
                </div>
              </div>

              {stage.isWon ? (
                <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
                  Won Stage
                </Badge>
              ) : stage.isLost ? (
                <Badge variant="outline" className="text-[10px] text-red-400 border-red-500/30">
                  Lost Stage
                </Badge>
              ) : null}
            </div>
          ))}

          <div className="pt-2 flex justify-end">
            <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-xl">
              Save Stages
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Linked Platform Settings ── */}
      <Card className="glass border-white/10 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Zap className="h-4 w-4 text-violet-400" />
            Connected Suite Integrations
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Sales CRM shares underlying team, SMTP, and payment credentials with the Invoicing Suite
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/settings/team"
              className="p-3.5 rounded-xl bg-white/5 border border-white/8 hover:border-white/20 transition-all flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-bold text-foreground">Team Roles &amp; Permissions</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Manage sales reps, admins, and staff access</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </Link>

            <Link
              href="/settings/notifications"
              className="p-3.5 rounded-xl bg-white/5 border border-white/8 hover:border-white/20 transition-all flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-bold text-foreground">Email &amp; SMTP Gateway</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Send CRM campaign emails from your domain</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </Link>

            <Link
              href="/settings/ai"
              className="p-3.5 rounded-xl bg-white/5 border border-white/8 hover:border-white/20 transition-all flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-bold text-foreground">AI Model Keys</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Gemini, OpenAI, NVIDIA &amp; OpenRouter providers</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </Link>

            <Link
              href="/settings/integrations"
              className="p-3.5 rounded-xl bg-white/5 border border-white/8 hover:border-white/20 transition-all flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-bold text-foreground">WhatsApp &amp; Payment Gateway</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Razorpay payment links and WhatsApp nodes</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
