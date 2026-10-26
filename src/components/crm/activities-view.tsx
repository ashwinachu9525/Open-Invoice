"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
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
  CalendarCheck,
  Search,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  Users,
  FileText,
  Calendar,
  Building,
  Briefcase,
  Target,
  Trash2,
  Plus,
  LayoutGrid,
  List,
  Columns3,
  Layers,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  Equal,
  MessageSquare,
  Send,
  User,
  CheckSquare,
  AlertCircle,
  ExternalLink,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import {
  createCrmActivity,
  updateActivityStatus,
  updateActivityDetails,
  addActivityComment,
  deleteActivity,
} from "@/actions/crm"

interface TeamMember {
  id: string
  name: string | null
  email: string
  role: string
}

interface ActivityItem {
  id: string
  jiraKey?: string
  title: string
  description?: string | null
  type: string
  status: string
  priority?: string
  dueDate?: string | null
  comments?: any[]
  assignedTo?: { id: string; name: string | null; email: string } | null
  customer?: { id: string; name: string; companyName?: string | null } | null
  deal?: { id: string; title: string; value: number } | null
  lead?: { id: string; name: string; companyName?: string | null } | null
  createdAt?: string
  updatedAt?: string
}

interface ActivitiesViewProps {
  initialActivities: ActivityItem[]
  teamMembers?: TeamMember[]
}

const JIRA_COLUMNS = [
  { id: "BACKLOG", label: "Backlog", color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  { id: "TODO", label: "To Do", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { id: "IN_PROGRESS", label: "In Progress", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  { id: "IN_REVIEW", label: "In Review", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  { id: "DONE", label: "Done", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
]

export function ActivitiesView({ initialActivities, teamMembers = [] }: ActivitiesViewProps) {
  const router = useRouter()
  const [viewMode, setViewMode] = React.useState<"board" | "backlog" | "list">("board")
  const [search, setSearch] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState("ALL")
  const [assigneeFilter, setAssigneeFilter] = React.useState("ALL")

  // Selected Activity for Jira Issue Detail Drawer/Modal
  const [selectedActivity, setSelectedActivity] = React.useState<ActivityItem | null>(null)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)

  // Quick Create Modal
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [createForm, setCreateForm] = React.useState({
    title: "",
    description: "",
    type: "TASK" as "TASK" | "CALL" | "MEETING" | "EMAIL" | "NOTE",
    status: "TODO" as "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE",
    priority: "MEDIUM" as "HIGHEST" | "HIGH" | "MEDIUM" | "LOW" | "LOWEST",
    dueDate: "",
    assignedToId: teamMembers[0]?.id || "",
  })
  const [creating, setCreating] = React.useState(false)

  // Comment Editor in Jira Detail
  const [commentHeading, setCommentHeading] = React.useState("Status Update")
  const [commentText, setCommentText] = React.useState("")
  const [postingComment, setPostingComment] = React.useState(false)

  // Filter activities
  const filtered = initialActivities.filter((act) => {
    const matchesSearch =
      !search ||
      act.title.toLowerCase().includes(search.toLowerCase()) ||
      (act.description && act.description.toLowerCase().includes(search.toLowerCase())) ||
      (act.jiraKey && act.jiraKey.toLowerCase().includes(search.toLowerCase())) ||
      (act.customer && act.customer.name.toLowerCase().includes(search.toLowerCase())) ||
      (act.lead && act.lead.name.toLowerCase().includes(search.toLowerCase()))

    const matchesType = typeFilter === "ALL" || act.type === typeFilter
    const matchesAssignee =
      assigneeFilter === "ALL" || act.assignedTo?.id === assigneeFilter

    return matchesSearch && matchesType && matchesAssignee
  })

  // Priority Icon renderer
  const renderPriorityIcon = (priority?: string) => {
    const p = (priority || "MEDIUM").toUpperCase()
    if (p === "HIGHEST") return <span title="Highest Priority"><ChevronsUp className="h-4 w-4 text-red-500" /></span>
    if (p === "HIGH") return <span title="High Priority"><ChevronUp className="h-4 w-4 text-orange-500" /></span>
    if (p === "MEDIUM") return <span title="Medium Priority"><Equal className="h-4 w-4 text-amber-400" /></span>
    if (p === "LOW") return <span title="Low Priority"><ChevronDown className="h-4 w-4 text-blue-400" /></span>
    return <span title="Lowest Priority"><ChevronsDown className="h-4 w-4 text-slate-400" /></span>
  }

  // Type Icon renderer
  const renderTypeIcon = (type: string) => {
    if (type === "CALL") return <Phone className="h-3.5 w-3.5 text-emerald-400" />
    if (type === "EMAIL") return <Mail className="h-3.5 w-3.5 text-amber-400" />
    if (type === "MEETING") return <Users className="h-3.5 w-3.5 text-purple-400" />
    if (type === "NOTE") return <FileText className="h-3.5 w-3.5 text-slate-400" />
    return <CheckSquare className="h-3.5 w-3.5 text-blue-400" />
  }

  const handleOpenDetail = (act: ActivityItem) => {
    setSelectedActivity(act)
    setIsDetailOpen(true)
    setCommentHeading("Status Update")
    setCommentText("")
  }

  const handleQuickStatusMove = async (e: React.MouseEvent, id: string, newStatus: string) => {
    e.stopPropagation()
    try {
      const res = await updateActivityDetails(id, { status: newStatus })
      if (res.error) throw new Error(res.error)
      toast.success(`Task moved to ${newStatus.replace(/_/g, " ")}`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to update status")
    }
  }

  const handleSaveDetailField = async (field: string, value: any) => {
    if (!selectedActivity) return
    try {
      const res = await updateActivityDetails(selectedActivity.id, { [field]: value })
      if (res.error) throw new Error(res.error)
      setSelectedActivity((prev) => (prev ? { ...prev, [field]: value } : null))
      toast.success("Task updated")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to save update")
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedActivity || !commentText.trim()) return
    setPostingComment(true)
    try {
      const res = await addActivityComment(selectedActivity.id, {
        heading: commentHeading.trim() || "Status Update",
        text: commentText.trim(),
      })
      if (res.error) throw new Error(res.error)

      toast.success("Comment added!")
      const newComment = (res as any).comment
      setSelectedActivity((prev) => {
        if (!prev) return null
        const currentComments = prev.comments || []
        return { ...prev, comments: [...currentComments, newComment] }
      })
      setCommentText("")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to post comment")
    } finally {
      setPostingComment(false)
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.title.trim()) {
      toast.error("Issue title is required")
      return
    }
    setCreating(true)
    try {
      const res = await createCrmActivity({
        title: createForm.title.trim(),
        description: createForm.description.trim() || undefined,
        type: createForm.type,
        status: createForm.status,
        priority: createForm.priority,
        dueDate: createForm.dueDate || null,
        assignedToId: createForm.assignedToId || undefined,
      })
      if (res.error) throw new Error(res.error)
      toast.success("New task created on Jira board!")
      setIsCreateOpen(false)
      setCreateForm({
        title: "",
        description: "",
        type: "TASK",
        status: "TODO",
        priority: "MEDIUM",
        dueDate: "",
        assignedToId: teamMembers[0]?.id || "",
      })
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to create task")
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await deleteActivity(id)
      if (res.error) throw new Error(res.error)
      toast.success("Task deleted")
      setIsDetailOpen(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete")
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Top Header Controls & Views Toggle ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* View Mode Switcher: Board vs Backlog vs List */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl glass border border-white/10 w-fit">
          <Button
            size="sm"
            variant={viewMode === "board" ? "default" : "ghost"}
            onClick={() => setViewMode("board")}
            className={`h-7 px-3 text-xs gap-1.5 rounded-lg ${
              viewMode === "board"
                ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Columns3 className="h-3.5 w-3.5" />
            <span>Jira Board</span>
          </Button>

          <Button
            size="sm"
            variant={viewMode === "backlog" ? "default" : "ghost"}
            onClick={() => setViewMode("backlog")}
            className={`h-7 px-3 text-xs gap-1.5 rounded-lg ${
              viewMode === "backlog"
                ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Sprint Backlog</span>
          </Button>

          <Button
            size="sm"
            variant={viewMode === "list" ? "default" : "ghost"}
            onClick={() => setViewMode("list")}
            className={`h-7 px-3 text-xs gap-1.5 rounded-lg ${
              viewMode === "list"
                ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="h-3.5 w-3.5" />
            <span>Table List</span>
          </Button>
        </div>

        {/* Search, Filters & Quick Create */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by key, title, customer..."
              className="pl-8 h-8 rounded-xl glass border-white/10 text-xs w-[220px]"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-8 px-2 text-xs bg-background/50 border border-white/10 rounded-xl text-foreground"
          >
            <option value="ALL">All Types</option>
            <option value="TASK">Tasks</option>
            <option value="CALL">Calls</option>
            <option value="MEETING">Meetings</option>
            <option value="EMAIL">Emails</option>
            <option value="NOTE">Notes</option>
          </select>

          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="h-8 px-2 text-xs bg-background/50 border border-white/10 rounded-xl text-foreground max-w-[140px]"
          >
            <option value="ALL">All Assignees</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name || m.email}
              </option>
            ))}
          </select>

          <Button
            onClick={() => setIsCreateOpen(true)}
            size="sm"
            className="h-8 gap-1 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Issue</span>
          </Button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          VIEW 1: JIRA BOARD (KANBAN COLUMNS)
          ───────────────────────────────────────────────────────────── */}
      {viewMode === "board" && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 items-start overflow-x-auto pb-4">
          {JIRA_COLUMNS.map((col) => {
            const colIssues = filtered.filter((act) => act.status === col.id)
            return (
              <div
                key={col.id}
                className="flex flex-col rounded-2xl glass border border-white/10 bg-white/2 min-w-[240px] max-h-[calc(100vh-230px)]"
              >
                {/* Column Header */}
                <div className="p-3 border-b border-white/5 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                      {col.label}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.2 rounded-full bg-white/5 text-muted-foreground">
                      {colIssues.length}
                    </span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setCreateForm((prev) => ({ ...prev, status: col.id as any }))
                      setIsCreateOpen(true)
                    }}
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    title={`Add task to ${col.label}`}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                {/* Cards Container */}
                <div className="p-2 space-y-2.5 overflow-y-auto flex-1">
                  {colIssues.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-white/5 rounded-xl">
                      No issues
                    </div>
                  ) : (
                    colIssues.map((act) => {
                      const commentsCount = Array.isArray(act.comments) ? act.comments.length : 0
                      const isOverdue = act.dueDate && new Date(act.dueDate) < new Date() && act.status !== "DONE"

                      return (
                        <div
                          key={act.id}
                          onClick={() => handleOpenDetail(act)}
                          className="group p-3 rounded-xl glass border border-white/10 hover:border-indigo-500/40 bg-white/3 hover:bg-white/6 shadow-sm transition-all cursor-pointer space-y-2"
                        >
                          {/* Top: Key + Type + Priority */}
                          <div className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-1.5">
                              {renderTypeIcon(act.type)}
                              <span className="font-mono font-semibold text-muted-foreground text-[10px] group-hover:text-indigo-400">
                                {act.jiraKey || "CRM-TASK"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {renderPriorityIcon(act.priority)}
                            </div>
                          </div>

                          {/* Middle: Summary Title */}
                          <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">
                            {act.title}
                          </p>

                          {/* Linked Lead / Customer / Deal */}
                          {(act.lead || act.customer || act.deal) && (
                            <div className="text-[10px] text-muted-foreground/80 flex items-center gap-1 truncate">
                              {act.lead && (
                                <span className="flex items-center gap-0.5 truncate text-emerald-400">
                                  <Target className="h-2.5 w-2.5 shrink-0" />
                                  <span className="truncate">{act.lead.name}</span>
                                </span>
                              )}
                              {act.customer && (
                                <span className="flex items-center gap-0.5 truncate text-blue-400">
                                  <Building className="h-2.5 w-2.5 shrink-0" />
                                  <span className="truncate">{act.customer.name}</span>
                                </span>
                              )}
                              {act.deal && (
                                <span className="flex items-center gap-0.5 truncate text-amber-400">
                                  <Briefcase className="h-2.5 w-2.5 shrink-0" />
                                  <span className="truncate">{act.deal.title}</span>
                                </span>
                              )}
                            </div>
                          )}

                          {/* Footer: Due date + Comments + Assignee Avatar */}
                          <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] text-muted-foreground">
                            <div className="flex items-center gap-2">
                              {act.dueDate && (
                                <span className={`flex items-center gap-1 ${isOverdue ? "text-red-400 font-bold" : ""}`}>
                                  <Clock className="h-3 w-3" />
                                  {new Date(act.dueDate).toLocaleDateString("en-IN", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              )}
                              {commentsCount > 0 && (
                                <span className="flex items-center gap-0.5 text-indigo-300">
                                  <MessageSquare className="h-3 w-3" />
                                  {commentsCount}
                                </span>
                              )}
                            </div>

                            {/* Assignee Pill */}
                            <div className="flex items-center gap-1">
                              <div
                                className="h-5 w-5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-[9px]"
                                title={act.assignedTo?.name || act.assignedTo?.email || "Unassigned"}
                              >
                                {(act.assignedTo?.name?.[0] || act.assignedTo?.email?.[0] || "U").toUpperCase()}
                              </div>
                            </div>
                          </div>

                          {/* Quick Column Progression Bar on Hover */}
                          <div className="hidden group-hover:flex items-center justify-between pt-1.5 border-t border-white/10">
                            <span className="text-[10px] text-muted-foreground">Move to:</span>
                            <div className="flex items-center gap-1">
                              {JIRA_COLUMNS.filter((c) => c.id !== col.id).map((c) => (
                                <button
                                  key={c.id}
                                  onClick={(e) => handleQuickStatusMove(e, act.id, c.id)}
                                  className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-foreground transition-colors"
                                >
                                  {c.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW 2: JIRA SPRINT & BACKLOG VIEW
          ───────────────────────────────────────────────────────────── */}
      {viewMode === "backlog" && (
        <div className="space-y-5">
          {/* Active Sprint Section */}
          <div className="rounded-2xl glass border border-white/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-[10px] uppercase border border-emerald-500/20">
                  Active Sprint
                </span>
                <h3 className="text-sm font-bold text-foreground">Sales Sprint #1</h3>
                <span className="text-xs text-muted-foreground">
                  ({filtered.filter((a) => a.status !== "BACKLOG").length} issues)
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setCreateForm((prev) => ({ ...prev, status: "TODO" }))
                  setIsCreateOpen(true)
                }}
                className="h-7 text-xs glass border-white/10 gap-1"
              >
                <Plus className="h-3 w-3" />
                Add Issue to Sprint
              </Button>
            </div>

            {/* Sprint Issues List */}
            <div className="divide-y divide-white/5 border border-white/5 rounded-xl overflow-hidden bg-white/1">
              {filtered.filter((a) => a.status !== "BACKLOG").length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Sprint backlog is empty. Drag or move tasks from Backlog into this sprint.
                </div>
              ) : (
                filtered
                  .filter((a) => a.status !== "BACKLOG")
                  .map((act) => (
                    <div
                      key={act.id}
                      onClick={() => handleOpenDetail(act)}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {renderPriorityIcon(act.priority)}
                        <span className="font-mono text-xs font-bold text-muted-foreground">
                          {act.jiraKey || "CRM-TASK"}
                        </span>
                        <div className="flex items-center gap-1.5 min-w-0">
                          {renderTypeIcon(act.type)}
                          <span className="text-xs font-medium text-foreground truncate">{act.title}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {act.comments && act.comments.length > 0 && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <MessageSquare className="h-3 w-3 text-indigo-400" />
                            {act.comments.length}
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold uppercase border-white/10"
                        >
                          {act.status.replace(/_/g, " ")}
                        </Badge>
                        <div className="h-6 w-6 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold flex items-center justify-center">
                          {(act.assignedTo?.name?.[0] || act.assignedTo?.email?.[0] || "U").toUpperCase()}
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Product Backlog Section */}
          <div className="rounded-2xl glass border border-white/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 font-bold text-[10px] uppercase border border-slate-500/20">
                  Backlog Pool
                </span>
                <h3 className="text-sm font-bold text-foreground">Backlog</h3>
                <span className="text-xs text-muted-foreground">
                  ({filtered.filter((a) => a.status === "BACKLOG").length} issues)
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setCreateForm((prev) => ({ ...prev, status: "BACKLOG" }))
                  setIsCreateOpen(true)
                }}
                className="h-7 text-xs glass border-white/10 gap-1"
              >
                <Plus className="h-3 w-3" />
                Create Backlog Issue
              </Button>
            </div>

            {/* Backlog List */}
            <div className="divide-y divide-white/5 border border-white/5 rounded-xl overflow-hidden bg-white/1">
              {filtered.filter((a) => a.status === "BACKLOG").length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Backlog is clean! No unprioritized issues.
                </div>
              ) : (
                filtered
                  .filter((a) => a.status === "BACKLOG")
                  .map((act) => (
                    <div
                      key={act.id}
                      onClick={() => handleOpenDetail(act)}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {renderPriorityIcon(act.priority)}
                        <span className="font-mono text-xs font-bold text-muted-foreground">
                          {act.jiraKey || "CRM-TASK"}
                        </span>
                        <div className="flex items-center gap-1.5 min-w-0">
                          {renderTypeIcon(act.type)}
                          <span className="text-xs font-medium text-foreground truncate">{act.title}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => handleQuickStatusMove(e, act.id, "TODO")}
                          className="h-6 text-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400"
                        >
                          Move to Sprint ➔
                        </Button>
                        <div className="h-6 w-6 rounded-full bg-slate-500/20 text-slate-300 text-[10px] font-bold flex items-center justify-center">
                          {(act.assignedTo?.name?.[0] || act.assignedTo?.email?.[0] || "U").toUpperCase()}
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW 3: DETAILED TABLE LIST
          ───────────────────────────────────────────────────────────── */}
      {viewMode === "list" && (
        <Card className="glass border-white/10 shadow-sm overflow-hidden">
          <div className="divide-y divide-white/5">
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted-foreground">No tasks match your criteria.</div>
            ) : (
              filtered.map((act) => (
                <div
                  key={act.id}
                  onClick={() => handleOpenDetail(act)}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="pt-0.5">{renderTypeIcon(act.type)}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-muted-foreground">
                          {act.jiraKey || "CRM-TASK"}
                        </span>
                        <h4 className="text-sm font-semibold text-foreground hover:underline">{act.title}</h4>
                      </div>
                      {act.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{act.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {renderPriorityIcon(act.priority)}
                    <Badge variant="outline" className="text-[10px] font-semibold uppercase border-white/15">
                      {act.status.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {act.assignedTo?.name || act.assignedTo?.email || "Unassigned"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────
          JIRA ISSUE DETAIL DRAWER / MODAL WITH COMMENTS
          ───────────────────────────────────────────────────────────── */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-4xl glass border-white/10 rounded-2xl max-h-[90vh] overflow-y-auto p-6">
          {selectedActivity && (
            <div className="space-y-6">
              {/* Header: Key & Type & Actions */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono text-xs font-bold">
                    {renderTypeIcon(selectedActivity.type)}
                    <span>{selectedActivity.jiraKey || "CRM-TASK"}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    {selectedActivity.type} Issue
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(selectedActivity.id)}
                    className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </Button>
                </div>
              </div>

              {/* Two Column Layout (Jira Layout) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left 2 Columns: Summary, Description, Comments */}
                <div className="md:col-span-2 space-y-6">
                  {/* Title / Summary */}
                  <div>
                    <Label className="text-[11px] text-muted-foreground uppercase font-semibold">Summary</Label>
                    <Input
                      defaultValue={selectedActivity.title}
                      onBlur={(e) => {
                        if (e.target.value !== selectedActivity.title) {
                          handleSaveDetailField("title", e.target.value)
                        }
                      }}
                      className="text-base font-bold text-foreground mt-1 glass border-white/10"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <Label className="text-[11px] text-muted-foreground uppercase font-semibold">Description</Label>
                    <Textarea
                      defaultValue={selectedActivity.description || ""}
                      onBlur={(e) => {
                        if (e.target.value !== (selectedActivity.description || "")) {
                          handleSaveDetailField("description", e.target.value)
                        }
                      }}
                      placeholder="Add a detailed description, acceptance criteria, or context..."
                      className="text-xs mt-1 glass border-white/10 min-h-[90px] resize-y"
                    />
                  </div>

                  {/* Linked Entity Banner */}
                  {(selectedActivity.lead || selectedActivity.customer || selectedActivity.deal) && (
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Linked CRM Entity
                      </span>
                      <div className="flex items-center gap-3 text-xs">
                        {selectedActivity.lead && (
                          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                            <Target className="h-3.5 w-3.5" />
                            Lead: {selectedActivity.lead.name}
                          </span>
                        )}
                        {selectedActivity.customer && (
                          <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
                            <Building className="h-3.5 w-3.5" />
                            Customer: {selectedActivity.customer.name}
                          </span>
                        )}
                        {selectedActivity.deal && (
                          <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                            <Briefcase className="h-3.5 w-3.5" />
                            Deal: {selectedActivity.deal.title} (₹{selectedActivity.deal.value.toLocaleString("en-IN")})
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ─────────────────────────────────────────────────────────────
                      JIRA-STYLE COMMENTS & ACTIVITY SECTION
                      ───────────────────────────────────────────────────────────── */}
                  <div className="space-y-4 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-indigo-400" />
                        <h4 className="text-sm font-bold text-foreground">
                          Activity & Comments ({(selectedActivity.comments || []).length})
                        </h4>
                      </div>
                    </div>

                    {/* Existing Comments Thread */}
                    <div className="space-y-3">
                      {(selectedActivity.comments || []).length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-2">
                          No comments yet. Post an update, meeting note, or blocker below.
                        </p>
                      ) : (
                        (selectedActivity.comments || []).map((comm: any, idx: number) => (
                          <div
                            key={comm.id || idx}
                            className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-[10px] flex items-center justify-center">
                                  {(comm.authorName?.[0] || "U").toUpperCase()}
                                </div>
                                <span className="text-xs font-semibold text-foreground">
                                  {comm.authorName || "Team Member"}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1.5 py-0 border-indigo-500/30 text-indigo-400 uppercase font-bold"
                                >
                                  {comm.heading || "Comment"}
                                </Badge>
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                {comm.createdAt
                                  ? new Date(comm.createdAt).toLocaleString("en-IN", {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "Just now"}
                              </span>
                            </div>
                            <p className="text-xs text-foreground/90 whitespace-pre-wrap pl-8">
                              {comm.text}
                            </p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add Comment Form with Heading Pills */}
                    <form onSubmit={handleAddComment} className="p-3 rounded-xl bg-white/3 border border-white/10 space-y-2.5">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Comment Heading / Category:</Label>
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                          {["Status Update", "Blocker", "Meeting Summary", "Client Feedback", "Next Steps"].map(
                            (pill) => (
                              <button
                                key={pill}
                                type="button"
                                onClick={() => setCommentHeading(pill)}
                                className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all ${
                                  commentHeading === pill
                                    ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300 font-semibold"
                                    : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {pill}
                              </button>
                            )
                          )}
                        </div>
                        <Input
                          value={commentHeading}
                          onChange={(e) => setCommentHeading(e.target.value)}
                          placeholder="e.g. Status Update, Blocker, Notes"
                          className="text-xs h-8 glass border-white/10"
                        />
                      </div>

                      <div className="space-y-1">
                        <Textarea
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Add your comment, markdown note, or mention colleagues..."
                          className="text-xs min-h-[70px] glass border-white/10 resize-none"
                        />
                      </div>

                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          size="sm"
                          disabled={postingComment || !commentText.trim()}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5 h-8"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>Save Comment</span>
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Right 1 Column: Jira Fields Sidebar */}
                <div className="space-y-4 p-4 rounded-xl bg-white/3 border border-white/10">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Issue Details
                  </h4>

                  {/* Status Dropdown */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Status</Label>
                    <select
                      value={selectedActivity.status}
                      onChange={(e) => handleSaveDetailField("status", e.target.value)}
                      className="w-full text-xs bg-background/50 border border-white/10 rounded-lg p-2 text-foreground font-semibold"
                    >
                      <option value="BACKLOG">Backlog</option>
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="IN_REVIEW">In Review</option>
                      <option value="DONE">Done</option>
                    </select>
                  </div>

                  {/* Priority Dropdown */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Priority</Label>
                    <select
                      value={selectedActivity.priority || "MEDIUM"}
                      onChange={(e) => handleSaveDetailField("priority", e.target.value)}
                      className="w-full text-xs bg-background/50 border border-white/10 rounded-lg p-2 text-foreground font-semibold"
                    >
                      <option value="HIGHEST">🔴 Highest</option>
                      <option value="HIGH">🟠 High</option>
                      <option value="MEDIUM">🟡 Medium</option>
                      <option value="LOW">🔵 Low</option>
                      <option value="LOWEST">⚪ Lowest</option>
                    </select>
                  </div>

                  {/* Assignee Dropdown */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Assignee</Label>
                    <select
                      value={selectedActivity.assignedTo?.id || ""}
                      onChange={(e) => handleSaveDetailField("assignedToId", e.target.value || null)}
                      className="w-full text-xs bg-background/50 border border-white/10 rounded-lg p-2 text-foreground"
                    >
                      <option value="">-- Unassigned --</option>
                      {teamMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name || m.email} ({m.role.replace(/_/g, " ")})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Due Date */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Due Date</Label>
                    <Input
                      type="date"
                      defaultValue={
                        selectedActivity.dueDate
                          ? new Date(selectedActivity.dueDate).toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) => handleSaveDetailField("dueDate", e.target.value || null)}
                      className="text-xs h-8 glass border-white/10"
                    />
                  </div>

                  {/* Activity Type */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Activity Type</Label>
                    <Badge variant="outline" className="w-full justify-start text-xs py-1 border-white/10">
                      {selectedActivity.type}
                    </Badge>
                  </div>

                  {/* Timestamps */}
                  <div className="pt-2 border-t border-white/5 space-y-1 text-[10px] text-muted-foreground">
                    <div>
                      Created:{" "}
                      {selectedActivity.createdAt
                        ? new Date(selectedActivity.createdAt).toLocaleDateString("en-IN")
                        : "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          CREATE NEW TASK / JIRA ISSUE MODAL
          ───────────────────────────────────────────────────────────── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg glass border-white/10 rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <CheckSquare className="h-4 w-4 text-indigo-400" />
              Create Task / Jira Issue
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add a new actionable task, meeting, or backlog item to your CRM workflow board.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTask} className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Title / Summary *</Label>
              <Input
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                placeholder="e.g. Schedule discovery call with Bangalore lead"
                className="text-xs mt-1 glass border-white/10"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Issue Type</Label>
                <select
                  value={createForm.type}
                  onChange={(e) => setCreateForm({ ...createForm, type: e.target.value as any })}
                  className="w-full text-xs bg-background/50 border border-white/10 rounded-lg p-2 text-foreground mt-1"
                >
                  <option value="TASK">Task</option>
                  <option value="CALL">Call</option>
                  <option value="MEETING">Meeting</option>
                  <option value="EMAIL">Email</option>
                  <option value="NOTE">Note</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Initial Board Column</Label>
                <select
                  value={createForm.status}
                  onChange={(e) => setCreateForm({ ...createForm, status: e.target.value as any })}
                  className="w-full text-xs bg-background/50 border border-white/10 rounded-lg p-2 text-foreground mt-1"
                >
                  <option value="BACKLOG">Backlog</option>
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="DONE">Done</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Priority</Label>
                <select
                  value={createForm.priority}
                  onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value as any })}
                  className="w-full text-xs bg-background/50 border border-white/10 rounded-lg p-2 text-foreground mt-1"
                >
                  <option value="HIGHEST">🔴 Highest</option>
                  <option value="HIGH">🟠 High</option>
                  <option value="MEDIUM">🟡 Medium</option>
                  <option value="LOW">🔵 Low</option>
                  <option value="LOWEST">⚪ Lowest</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Assignee</Label>
                <select
                  value={createForm.assignedToId}
                  onChange={(e) => setCreateForm({ ...createForm, assignedToId: e.target.value })}
                  className="w-full text-xs bg-background/50 border border-white/10 rounded-lg p-2 text-foreground mt-1"
                >
                  <option value="">-- Unassigned --</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Due Date</Label>
              <Input
                type="date"
                value={createForm.dueDate}
                onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                className="text-xs mt-1 glass border-white/10"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Key details, client requirements, or agenda..."
                className="text-xs mt-1 glass border-white/10 min-h-[60px] resize-none"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                {creating ? "Creating..." : "Create Issue"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
