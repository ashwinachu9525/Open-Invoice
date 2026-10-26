"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Workflow,
  Plus,
  Play,
  ArrowRight,
  CheckCircle2,
  Trash2,
  Zap,
  Filter,
  Layers,
  Sparkles,
  Clock,
  UserCheck,
  Mail,
  FileCheck,
  Receipt,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { createCrmWorkflow, toggleWorkflow, deleteWorkflow } from "@/actions/crm"

interface WorkflowStudioProps {
  initialWorkflows: any[]
}

export function WorkflowStudio({ initialWorkflows }: WorkflowStudioProps) {
  const router = useRouter()
  const [workflows, setWorkflows] = React.useState(initialWorkflows)
  const [openBuilder, setOpenBuilder] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  // Builder state
  const [name, setName] = React.useState("Bengaluru Inbound Leads Automation")
  const [description, setDescription] = React.useState("Assign local sales rep, schedule next-day task, and draft email.")
  const [triggerType, setTriggerType] = React.useState("LEAD_CREATED")

  const [conditions, setConditions] = React.useState<Array<{ field: string; operator: any; value: string }>>([
    { field: "region", operator: "equals", value: "Bengaluru" },
  ])

  const [actions, setActions] = React.useState<Array<{ actionType: any; label: string; config: any }>>([
    { actionType: "ASSIGN_USER", label: "Assign to Sales Representative", config: { role: "SALES_REP" } },
    { actionType: "CREATE_TASK", label: "Schedule follow-up task for tomorrow", config: { title: "Follow-up with Bengaluru Lead", dueDays: 1 } },
    { actionType: "DRAFT_EMAIL", label: "Draft Welcome Email", config: { subject: "Welcome to Open-Invoice!", body: "Hi, thank you for reaching out..." } },
  ])

  const handleToggle = async (id: string, current: boolean) => {
    try {
      const res = await toggleWorkflow(id, !current)
      if (res.error) throw new Error(res.error)
      toast.success(!current ? "Workflow activated!" : "Workflow paused")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle workflow")
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await deleteWorkflow(id)
      if (res.error) throw new Error(res.error)
      toast.success("Workflow removed")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete workflow")
    }
  }

  const handleSaveWorkflow = async () => {
    if (!name) {
      toast.error("Workflow name is required")
      return
    }
    setLoading(true)
    try {
      const res = await createCrmWorkflow({
        name,
        description,
        triggerType,
        conditions,
        actions: actions.map(a => ({ actionType: a.actionType, config: a.config })),
        isActive: true,
      })
      if (res.error) throw new Error(res.error)
      toast.success(`Workflow "${name}" created and published!`)
      setOpenBuilder(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to create workflow")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Studio Banner & Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl glass border border-white/10 bg-gradient-to-br from-indigo-500/10 via-background to-emerald-500/10">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
            Visual Automation Engine
          </span>
          <h2 className="text-xl font-bold text-foreground mt-1">Custom Sales Workflows</h2>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
            Empower your organization to build custom <strong>Trigger ➔ Conditions ➔ Actions</strong> rules. Eliminate repetitive tasks, assign leads dynamically, and accelerate deal velocity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setOpenBuilder(true)}
            className="h-9 gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20"
          >
            <Plus className="h-4 w-4" />
            <span>Open Builder</span>
          </Button>
        </div>
      </div>

      {/* ── Workflows Grid ── */}
      {initialWorkflows.length === 0 ? (
        <Card className="glass border-white/10 p-12 text-center">
          <Workflow className="h-10 w-10 text-indigo-400 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-semibold text-foreground">No custom workflows defined yet</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            Build your first automation or ask the CRM AI Assistant: <em>&ldquo;Create a workflow for new leads from Bengaluru&rdquo;</em>.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button onClick={() => setOpenBuilder(true)} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
              Create First Workflow
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {initialWorkflows.map((wf) => {
            const conds = Array.isArray(wf.conditions) ? wf.conditions : []
            const acts = Array.isArray(wf.actions) ? wf.actions : []

            return (
              <Card key={wf.id} className="glass border-white/10 shadow-sm rounded-2xl overflow-hidden hover:border-white/20 transition-all">
                <CardHeader className="pb-3 border-b border-white/5 bg-white/2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-sm font-bold text-foreground">{wf.name}</CardTitle>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0.5 rounded-full ${
                            wf.isActive
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-white/5 text-muted-foreground"
                          }`}
                        >
                          {wf.isActive ? "Active" : "Paused"}
                        </Badge>
                      </div>
                      {wf.description && (
                        <CardDescription className="text-xs text-muted-foreground mt-1">
                          {wf.description}
                        </CardDescription>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground font-medium">Active</span>
                        <Switch
                          checked={wf.isActive}
                          onCheckedChange={() => handleToggle(wf.id, wf.isActive)}
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(wf.id)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                  {/* ── Visual Trigger ➔ Conditions ➔ Actions Node Diagram ── */}
                  <div className="flex flex-col md:flex-row md:items-center gap-3 overflow-x-auto py-2">
                    {/* Trigger Node */}
                    <div className="flex-1 min-w-[200px] p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                      <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider flex items-center gap-1 mb-1">
                        <Zap className="h-3 w-3" /> Trigger
                      </span>
                      <p className="text-xs font-bold text-foreground">
                        {wf.triggerType.replace(/_/g, " ")}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">When event is emitted</p>
                    </div>

                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 hidden md:block" />

                    {/* Condition Node */}
                    <div className="flex-1 min-w-[200px] p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                      <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider flex items-center gap-1 mb-1">
                        <Filter className="h-3 w-3" /> Conditions ({conds.length})
                      </span>
                      {conds.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Always execute (No filters)</p>
                      ) : (
                        <div className="space-y-1">
                          {conds.map((c: any, idx: number) => (
                            <p key={idx} className="text-xs font-semibold text-foreground">
                              {c.field} {c.operator} &ldquo;{c.value}&rdquo;
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 hidden md:block" />

                    {/* Actions Node */}
                    <div className="flex-1 min-w-[240px] p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1 mb-1">
                        <Layers className="h-3 w-3" /> Actions ({acts.length})
                      </span>
                      <div className="space-y-1">
                        {acts.map((a: any, idx: number) => (
                          <div key={idx} className="text-xs font-medium text-foreground flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            <span>{a.actionType.replace(/_/g, " ")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Execution Telemetry Footer */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-white/5">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      Executed {wf.executionCount || 0} times
                    </span>
                    {wf.lastExecutedAt && (
                      <span>Last run: {new Date(wf.lastExecutedAt).toLocaleDateString("en-IN")}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Visual Workflow Builder Modal ── */}
      <Dialog open={openBuilder} onOpenChange={setOpenBuilder}>
        <DialogContent className="sm:max-w-2xl glass border-white/10 rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Workflow className="h-4 w-4 text-indigo-400" />
              Visual Workflow Builder
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define the Trigger, evaluation Conditions, and target Actions for your automated business process.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* 1. Workflow Meta */}
            <div className="space-y-2">
              <Label className="text-xs">Workflow Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Inbound Leads from Bengaluru Assignment"
                className="text-xs"
              />
            </div>

            {/* 2. Step 1: Trigger */}
            <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[11px] font-bold flex items-center justify-center">
                  1
                </span>
                <span className="text-xs font-bold text-foreground">Trigger (When this happens)</span>
              </div>
              <select
                className="w-full text-xs bg-background/50 border border-white/10 rounded-lg p-2 text-foreground"
                value={triggerType}
                onChange={(e) => setTriggerType(e.target.value)}
              >
                <option value="LEAD_CREATED">New Lead Created</option>
                <option value="LEAD_STATUS_CHANGED">Lead Status Changed</option>
                <option value="DEAL_CREATED">New Deal Logged</option>
                <option value="DEAL_STAGE_CHANGED">Deal Stage Changed</option>
                <option value="DEAL_WON">Deal Marked as Won</option>
                <option value="ACTIVITY_OVERDUE">Activity Past Due Date</option>
              </select>
            </div>

            {/* 3. Step 2: Conditions */}
            <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-500 text-white text-[11px] font-bold flex items-center justify-center">
                    2
                  </span>
                  <span className="text-xs font-bold text-foreground">Conditions (Only if matching)</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConditions([...conditions, { field: "region", operator: "equals", value: "Bengaluru" }])}
                  className="h-7 text-[11px] text-purple-400 hover:text-purple-300"
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Condition
                </Button>
              </div>

              {conditions.map((cond, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-2">
                  <Input
                    value={cond.field}
                    onChange={(e) => {
                      const updated = [...conditions]
                      updated[idx].field = e.target.value
                      setConditions(updated)
                    }}
                    placeholder="Field (e.g. region, score)"
                    className="text-xs"
                  />
                  <select
                    value={cond.operator}
                    onChange={(e) => {
                      const updated = [...conditions]
                      updated[idx].operator = e.target.value as any
                      setConditions(updated)
                    }}
                    className="text-xs bg-background/50 border border-white/10 rounded-lg px-2 text-foreground"
                  >
                    <option value="equals">equals</option>
                    <option value="contains">contains</option>
                    <option value="greater_than">greater than</option>
                    <option value="less_than">less than</option>
                  </select>
                  <div className="flex items-center gap-1">
                    <Input
                      value={cond.value}
                      onChange={(e) => {
                        const updated = [...conditions]
                        updated[idx].value = e.target.value
                        setConditions(updated)
                      }}
                      placeholder="Target Value"
                      className="text-xs"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConditions(conditions.filter((_, i) => i !== idx))}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400 shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* 4. Step 3: Actions */}
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center">
                    3
                  </span>
                  <span className="text-xs font-bold text-foreground">Actions (Execute sequentially)</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setActions([...actions, { actionType: "CREATE_TASK", label: "Create Follow-up Task", config: { title: "Follow up" } }])}
                  className="h-7 text-[11px] text-emerald-400 hover:text-emerald-300"
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Action
                </Button>
              </div>

              {actions.map((act, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="font-semibold text-foreground">{act.label}</span>
                    <Badge variant="outline" className="text-[10px] border-white/15">
                      {act.actionType}
                    </Badge>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setActions(actions.filter((_, i) => i !== idx))}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenBuilder(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              onClick={handleSaveWorkflow}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
            >
              {loading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Publish Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
