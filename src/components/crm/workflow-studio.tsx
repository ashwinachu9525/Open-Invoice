"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
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
  User,
  Calendar,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import { createCrmWorkflow, toggleWorkflow, deleteWorkflow } from "@/actions/crm"

interface TeamMember {
  id: string
  name: string | null
  email: string
  role: string
}

interface WorkflowStudioProps {
  initialWorkflows: any[]
  teamMembers?: TeamMember[]
}

export function WorkflowStudio({ initialWorkflows, teamMembers = [] }: WorkflowStudioProps) {
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
    {
      actionType: "ASSIGN_USER",
      label: "Assign to Sales Representative",
      config: {
        userId: teamMembers[0]?.id || "",
        userName: teamMembers[0]?.name || teamMembers[0]?.email || "Sales Rep",
      },
    },
    {
      actionType: "CREATE_TASK",
      label: "Schedule follow-up task for tomorrow",
      config: {
        title: "Follow up with Bengaluru Lead",
        dueDays: 1,
        priority: "HIGH",
        assignedToId: teamMembers[0]?.id || "",
      },
    },
    {
      actionType: "DRAFT_EMAIL",
      label: "Draft Welcome Email",
      config: {
        subject: "Welcome to Open-Invoice!",
        body: "Hi, thank you for reaching out. We would love to schedule a demo of our platform.",
      },
    },
  ])

  // New action selector inside builder
  const [newActionType, setNewActionType] = React.useState<string>("ASSIGN_USER")

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

  const handleAddAction = () => {
    if (newActionType === "ASSIGN_USER") {
      const firstUser = teamMembers[0]
      setActions([
        ...actions,
        {
          actionType: "ASSIGN_USER",
          label: firstUser ? `Assign to ${firstUser.name || firstUser.email}` : "Assign to Sales Representative",
          config: {
            userId: firstUser?.id || "",
            userName: firstUser?.name || firstUser?.email || "Sales Rep",
          },
        },
      ])
    } else if (newActionType === "CREATE_TASK") {
      setActions([
        ...actions,
        {
          actionType: "CREATE_TASK",
          label: "Create Follow-up Task",
          config: {
            title: "Follow up on customer inquiry",
            dueDays: 1,
            priority: "MEDIUM",
            assignedToId: teamMembers[0]?.id || "",
          },
        },
      ])
    } else if (newActionType === "DRAFT_EMAIL") {
      setActions([
        ...actions,
        {
          actionType: "DRAFT_EMAIL",
          label: "Draft Onboarding Email",
          config: {
            subject: "Welcome to our platform!",
            body: "Hi, welcome aboard! Here are the next steps to get started...",
          },
        },
      ])
    } else if (newActionType === "UPDATE_STATUS") {
      setActions([
        ...actions,
        {
          actionType: "UPDATE_STATUS",
          label: "Update Status to QUALIFIED",
          config: {
            status: "QUALIFIED",
          },
        },
      ])
    } else if (newActionType === "CREATE_INVOICE_DRAFT") {
      setActions([
        ...actions,
        {
          actionType: "CREATE_INVOICE_DRAFT",
          label: "Generate Tax Invoice Draft",
          config: {
            notes: "Auto-generated from closed deal",
          },
        },
      ])
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
        actions: actions.map((a) => ({ actionType: a.actionType, config: a.config })),
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

  // Helper to format action labels on the workflow card
  const formatActionDisplay = (act: any) => {
    if (act.actionType === "ASSIGN_USER") {
      const member = teamMembers.find((m) => m.id === act.config?.userId)
      const name = member?.name || member?.email || act.config?.userName || "Sales Rep"
      return `ASSIGN USER ➔ ${name}`
    }
    if (act.actionType === "CREATE_TASK") {
      const title = act.config?.title || "Follow-up Task"
      const days = act.config?.dueDays ? `(+${act.config.dueDays}d)` : "(Tomorrow)"
      return `CREATE TASK ➔ "${title}" ${days}`
    }
    if (act.actionType === "DRAFT_EMAIL") {
      const subject = act.config?.subject || "Welcome Email"
      return `DRAFT EMAIL ➔ "${subject}"`
    }
    if (act.actionType === "UPDATE_STATUS") {
      return `UPDATE STATUS ➔ ${act.config?.status || "QUALIFIED"}`
    }
    if (act.actionType === "CREATE_INVOICE_DRAFT") {
      return `CREATE INVOICE DRAFT in Invoicing Suite`
    }
    return act.actionType.replace(/_/g, " ")
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
            Empower your team to build custom <strong>Trigger ➔ Conditions ➔ Actions</strong> rules. Automatically route leads to specific reps, schedule Jira-style tasks, and draft outreach emails.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setOpenBuilder(true)}
            className="h-9 gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20"
          >
            <Plus className="h-4 w-4" />
            <span>New Workflow</span>
          </Button>
        </div>
      </div>

      {/* ── Workflows Grid ── */}
      {initialWorkflows.length === 0 ? (
        <Card className="glass border-white/10 p-12 text-center">
          <Workflow className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <h3 className="text-base font-semibold text-foreground">No automated workflows yet</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Build your first workflow to automate lead assignment and follow-up activities, or ask the CRM AI Assistant to generate one.
          </p>
          <Button
            onClick={() => setOpenBuilder(true)}
            size="sm"
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Workflow
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {initialWorkflows.map((wf) => {
            const conds = Array.isArray(wf.conditions) ? wf.conditions : []
            const acts = Array.isArray(wf.actions) ? wf.actions : []

            return (
              <Card key={wf.id} className="glass border-white/10 shadow-sm overflow-hidden">
                <CardHeader className="p-4 pb-3 border-b border-white/5 bg-white/2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm font-bold text-foreground">{wf.name}</CardTitle>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${
                            wf.isActive
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-white/5 text-muted-foreground border-white/10"
                          }`}
                        >
                          {wf.isActive ? "Active" : "Paused"}
                        </Badge>
                      </div>
                      {wf.description && (
                        <CardDescription className="text-xs text-muted-foreground">
                          {wf.description}
                        </CardDescription>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{wf.isActive ? "Active" : "Paused"}</span>
                        <Switch checked={wf.isActive} onCheckedChange={() => handleToggle(wf.id, wf.isActive)} />
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(wf.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-red-400"
                        title="Delete workflow"
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
                    <div className="flex-1 min-w-[260px] p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1 mb-1">
                        <Layers className="h-3 w-3" /> Actions ({acts.length})
                      </span>
                      <div className="space-y-1.5">
                        {acts.map((a: any, idx: number) => (
                          <div key={idx} className="text-xs font-medium text-foreground flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            <span className="truncate">{formatActionDisplay(a)}</span>
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
        <DialogContent className="sm:max-w-2xl glass border-white/10 rounded-2xl max-h-[90vh] overflow-y-auto">
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
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Workflow Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Inbound Bengaluru Leads Automation"
                  className="text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What this workflow achieves..."
                  className="text-xs mt-1"
                />
              </div>
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
                    <option value="not_equals">not equals</option>
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

            {/* 4. Step 3: Actions (With Specific User Assignment & Task Configuration) */}
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center">
                    3
                  </span>
                  <span className="text-xs font-bold text-foreground">Actions (Executed in order)</span>
                </div>
              </div>

              {/* Action List */}
              <div className="space-y-3">
                {actions.map((act, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 font-semibold">
                          {act.actionType}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setActions(actions.filter((_, i) => i !== idx))}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-red-400"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Specific Action Config Fields */}
                    {act.actionType === "ASSIGN_USER" && (
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3 text-emerald-400" />
                          Assign To Team Member:
                        </Label>
                        <select
                          value={act.config?.userId || ""}
                          onChange={(e) => {
                            const selectedUser = teamMembers.find((m) => m.id === e.target.value)
                            const updated = [...actions]
                            updated[idx].config = {
                              ...updated[idx].config,
                              userId: e.target.value,
                              userName: selectedUser?.name || selectedUser?.email || "Sales Rep",
                            }
                            updated[idx].label = selectedUser
                              ? `Assign to ${selectedUser.name || selectedUser.email}`
                              : "Assign to Team Member"
                            setActions(updated)
                          }}
                          className="w-full text-xs bg-background/50 border border-white/10 rounded-lg p-2 text-foreground"
                        >
                          <option value="">-- Auto-Assign Company Owner / Any Rep --</option>
                          {teamMembers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name || m.email} ({m.role.replace(/_/g, " ")})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {act.actionType === "CREATE_TASK" && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-2 space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Task Title</Label>
                          <Input
                            value={act.config?.title || ""}
                            onChange={(e) => {
                              const updated = [...actions]
                              updated[idx].config.title = e.target.value
                              setActions(updated)
                            }}
                            placeholder="e.g. Schedule Discovery Call"
                            className="text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Due In (Days)</Label>
                          <Input
                            type="number"
                            min="1"
                            value={act.config?.dueDays || 1}
                            onChange={(e) => {
                              const updated = [...actions]
                              updated[idx].config.dueDays = Number(e.target.value) || 1
                              setActions(updated)
                            }}
                            className="text-xs h-8"
                          />
                        </div>
                      </div>
                    )}

                    {act.actionType === "DRAFT_EMAIL" && (
                      <div className="space-y-1.5">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Email Subject</Label>
                          <Input
                            value={act.config?.subject || ""}
                            onChange={(e) => {
                              const updated = [...actions]
                              updated[idx].config.subject = e.target.value
                              setActions(updated)
                            }}
                            placeholder="e.g. Welcome to Open-Invoice!"
                            className="text-xs h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Email Body Template</Label>
                          <Textarea
                            value={act.config?.body || ""}
                            onChange={(e) => {
                              const updated = [...actions]
                              updated[idx].config.body = e.target.value
                              setActions(updated)
                            }}
                            placeholder="Hi, thank you for reaching out..."
                            className="text-xs h-16 resize-none"
                          />
                        </div>
                      </div>
                    )}

                    {act.actionType === "UPDATE_STATUS" && (
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Target Status</Label>
                        <select
                          value={act.config?.status || "QUALIFIED"}
                          onChange={(e) => {
                            const updated = [...actions]
                            updated[idx].config.status = e.target.value
                            setActions(updated)
                          }}
                          className="w-full text-xs bg-background/50 border border-white/10 rounded-lg p-2 text-foreground"
                        >
                          <option value="NEW">NEW</option>
                          <option value="CONTACTED">CONTACTED</option>
                          <option value="QUALIFIED">QUALIFIED</option>
                          <option value="CONVERTED">CONVERTED</option>
                        </select>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add New Action Selector */}
              <div className="pt-2 flex items-center gap-2">
                <select
                  value={newActionType}
                  onChange={(e) => setNewActionType(e.target.value)}
                  className="flex-1 text-xs bg-background/50 border border-white/10 rounded-lg p-2 text-foreground"
                >
                  <option value="ASSIGN_USER">ASSIGN_USER - Assign to Specific Sales Rep</option>
                  <option value="CREATE_TASK">CREATE_TASK - Schedule Jira Task with Due Date</option>
                  <option value="DRAFT_EMAIL">DRAFT_EMAIL - Prepare Outreach Email Draft</option>
                  <option value="UPDATE_STATUS">UPDATE_STATUS - Automatically Advance Status</option>
                  <option value="CREATE_INVOICE_DRAFT">CREATE_INVOICE_DRAFT - Draft Invoicing Suite Bill</option>
                </select>
                <Button
                  size="sm"
                  type="button"
                  onClick={handleAddAction}
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white shrink-0"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Action
                </Button>
              </div>
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
