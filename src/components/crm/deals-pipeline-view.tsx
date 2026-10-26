"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Briefcase,
  Search,
  Plus,
  ArrowRight,
  TrendingUp,
  Building,
  User,
  Calendar,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  ListFilter,
  DollarSign,
  ChevronRight,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { updateDealStage } from "@/actions/crm"

interface DealsPipelineViewProps {
  initialStages: any[]
  totalDeals: number
}

export function DealsPipelineView({ initialStages, totalDeals }: DealsPipelineViewProps) {
  const router = useRouter()
  const [stages, setStages] = React.useState(initialStages)
  const [search, setSearch] = React.useState("")
  const [viewMode, setViewMode] = React.useState<"kanban" | "list">("kanban")
  const [updatingDealId, setUpdatingDealId] = React.useState<string | null>(null)

  const totalPipelineValue = stages.reduce((sum, s) => sum + (s.totalValue || 0), 0)
  const totalForecastValue = stages.reduce((sum, s) => sum + (s.weightedValue || 0), 0)

  const handleMoveStage = async (dealId: string, currentStageId: string, direction: "next" | "prev") => {
    const currentIdx = stages.findIndex((s) => s.id === currentStageId)
    const targetIdx = direction === "next" ? currentIdx + 1 : currentIdx - 1
    if (targetIdx < 0 || targetIdx >= stages.length) return

    const targetStage = stages[targetIdx]
    setUpdatingDealId(dealId)

    try {
      const res = await updateDealStage(dealId, targetStage.id)
      if (res.error) throw new Error(res.error)
      toast.success(`Moved deal to "${targetStage.name}"`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to move deal")
    } finally {
      setUpdatingDealId(null)
    }
  }

  return (
    <div className="space-y-5">
      {/* ── Pipeline KPI Header & Controls ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl glass border border-white/10">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Active Pipeline Value
            </span>
            <span className="text-xl font-bold text-foreground">
              ₹{totalPipelineValue.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="h-8 w-px bg-white/10 hidden sm:block" />

          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Weighted Forecast
            </span>
            <span className="text-xl font-bold text-emerald-400">
              ₹{totalForecastValue.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="h-8 w-px bg-white/10 hidden sm:block" />

          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Opportunities
            </span>
            <span className="text-xl font-bold text-foreground">
              {totalDeals} <span className="text-xs font-normal text-muted-foreground">deals</span>
            </span>
          </div>
        </div>

        {/* View toggles & search */}
        <div className="flex items-center gap-2">
          <div className="relative w-48 sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search deals..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 rounded-xl glass border-white/10 text-xs"
            />
          </div>

          <div className="flex items-center rounded-xl bg-white/5 p-0.5 border border-white/10">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("kanban")}
              className={`h-7 px-2.5 rounded-lg text-xs font-medium ${
                viewMode === "kanban" ? "bg-white/10 text-foreground" : "text-muted-foreground"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5 mr-1" /> Board
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("list")}
              className={`h-7 px-2.5 rounded-lg text-xs font-medium ${
                viewMode === "list" ? "bg-white/10 text-foreground" : "text-muted-foreground"
              }`}
            >
              <ListFilter className="h-3.5 w-3.5 mr-1" /> List
            </Button>
          </div>
        </div>
      </div>

      {/* ── Kanban Pipeline Board ── */}
      {viewMode === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-6 min-h-[550px] items-start">
          {stages.map((stage, stageIdx) => {
            const stageDeals = (stage.deals || []).filter((d: any) =>
              !search ||
              d.title.toLowerCase().includes(search.toLowerCase()) ||
              (d.customer && d.customer.name.toLowerCase().includes(search.toLowerCase()))
            )

            return (
              <div
                key={stage.id}
                className="w-80 shrink-0 flex flex-col rounded-2xl glass border border-white/10 overflow-hidden bg-background/40"
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-white/8 bg-white/3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: stage.color || "#3b82f6" }}
                      />
                      <span className="text-xs font-bold text-foreground truncate max-w-[140px]">
                        {stage.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        ({stageDeals.length})
                      </span>
                    </div>

                    <span className="text-[11px] font-semibold text-emerald-400">
                      ₹{(stage.totalValue || 0).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Probability: {stage.probability}%</span>
                    <span>Weighted: ₹{(stage.weightedValue || 0).toLocaleString("en-IN")}</span>
                  </div>
                </div>

                {/* Column Cards */}
                <div className="p-2 space-y-2.5 overflow-y-auto max-h-[650px]">
                  {stageDeals.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-white/10 rounded-xl m-1">
                      No deals in this stage
                    </div>
                  ) : (
                    stageDeals.map((deal: any) => {
                      const isUpdating = updatingDealId === deal.id
                      return (
                        <Card
                          key={deal.id}
                          className="glass border-white/10 p-3 hover:border-white/20 transition-all rounded-xl shadow-sm space-y-2.5"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-1">
                              <h4 className="text-xs font-bold text-foreground leading-snug line-clamp-2">
                                {deal.title}
                              </h4>
                            </div>
                            {deal.customer && (
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1 truncate">
                                <Building className="h-3 w-3 shrink-0" />
                                <span className="truncate">{deal.customer.companyName || deal.customer.name}</span>
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                            <span className="font-bold text-foreground">
                              ₹{(deal.value || 0).toLocaleString("en-IN")}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-medium">
                              {deal.probability}% prob
                            </span>
                          </div>

                          {/* Quick Stage Move Buttons */}
                          <div className="flex items-center justify-between pt-1 gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={stageIdx === 0 || isUpdating}
                              onClick={() => handleMoveStage(deal.id, stage.id, "prev")}
                              className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                            >
                              ← Prev
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={stageIdx === stages.length - 1 || isUpdating}
                              onClick={() => handleMoveStage(deal.id, stage.id, "next")}
                              className="h-6 px-1.5 text-[10px] text-emerald-400 hover:text-emerald-300 font-medium"
                            >
                              {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Advance →"}
                            </Button>
                          </div>
                        </Card>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ── List View ── */
        <Card className="glass border-white/10 overflow-hidden">
          <div className="divide-y divide-white/5">
            {stages.flatMap((s) => (s.deals || []).map((d: any) => ({ ...d, currentStage: s }))).length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">No deals created yet.</div>
            ) : (
              stages.flatMap((s) => (s.deals || []).map((d: any) => ({ ...d, currentStage: s }))).map((deal: any) => (
                <div key={deal.id} className="p-4 flex items-center justify-between gap-4 hover:bg-white/3 transition-colors">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-foreground">{deal.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Client: {deal.customer?.companyName || deal.customer?.name || "Direct Account"}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="text-xs border-white/15">
                      {deal.currentStage.name}
                    </Badge>
                    <span className="text-sm font-bold text-emerald-400">
                      ₹{(deal.value || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
