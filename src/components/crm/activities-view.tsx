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
  History,
  GitCommit,
  Check,
  Edit3,
} from "lucide-react"
import { toast } from "sonner"
import {
  createCrmActivity,
  updateActivityStatus,
  updateActivityDetails,
  addActivityComment,
  deleteActivity,
  addActivitySubtask,
  toggleActivitySubtask,
  deleteActivitySubtask,
} from "@/actions/crm"
import { JiraMarkdownEditor, JiraMarkdownViewer } from "@/components/crm/jira-markdown"
import { cn } from "@/lib/utils"

interface TeamMember {
  id: string
  name: string | null
  email: string
  role: string
}

interface SubtaskItem {
  id: string
  key?: string
  title: string
  completed: boolean
  assigneeName?: string | null
  createdAt?: string
}

interface HistoryItem {
  id: string
  authorName: string
  field?: string
  action?: string
  from?: string
  to?: string
  text?: string
  createdAt: string
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
  subtasks?: SubtaskItem[]
  history?: HistoryItem[]
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
  { id: "BACKLOG", label: "Backlog", color: "border-slate-500/20 bg-slate-500/5", badge: "bg-slate-500/10 text-slate-400" },
  { id: "TODO", label: "To Do", color: "border-blue-500/20 bg-blue-500/5", badge: "bg-blue-500/10 text-blue-400" },
  { id: "IN_PROGRESS", label: "In Progress", color: "border-amber-500/20 bg-amber-500/5", badge: "bg-amber-500/10 text-amber-400" },
  { id: "IN_REVIEW", label: "In Review", color: "border-purple-500/20 bg-purple-500/5", badge: "bg-purple-500/10 text-purple-400" },
  { id: "DONE", label: "Done", color: "border-emerald-500/20 bg-emerald-500/5", badge: "bg-emerald-500/10 text-emerald-400" },
]

export function ActivitiesView({ initialActivities, teamMembers = [] }: ActivitiesViewProps) {
  const router = useRouter()
  const [viewMode, setViewMode] = React.useState<"board" | "backlog" | "list">("board")
  const [search, setSearch] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState("ALL")
  const [assigneeFilter, setAssigneeFilter] = React.useState("ALL")

  // Detail Modal / Jira Drawer
  const [selectedActivity, setSelectedActivity] = React.useState<ActivityItem | null>(null)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<"comments" | "history">("comments")

  // Markdown Description state
  const [descValue, setDescValue] = React.useState("")
  const [isDescDirty, setIsDescDirty] = React.useState(false)

  // Subtask form state
  const [subtaskTitle, setSubtaskTitle] = React.useState("")
  const [subtaskAssignee, setSubtaskAssignee] = React.useState("")
  const [addingSubtask, setAddingSubtask] = React.useState(false)

  // Comments state
  const [commentHeading, setCommentHeading] = React.useState("Status Update")
  const [commentText, setCommentText] = React.useState("")
  const [postingComment, setPostingComment] = React.useState(false)

  // Create Task Modal
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [creating, setCreating] = React.useState(false)
  const [createForm, setCreateForm] = React.useState<{
    title: string
    description: string
    type: "CALL" | "EMAIL" | "MEETING" | "NOTE" | "TASK"
    status: "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "PENDING" | "COMPLETED"
    priority: "HIGHEST" | "HIGH" | "MEDIUM" | "LOW" | "LOWEST"
    dueDate: string
    assignedToId: string
  }>({
    title: "",
    description: "",
    type: "TASK",
    status: "TODO",
    priority: "MEDIUM",
    dueDate: "",
    assignedToId: "",
  })

  // Filter activities
  const filtered = initialActivities.filter((act) => {
    const matchesSearch =
      !search ||
      act.title.toLowerCase().includes(search.toLowerCase()) ||
      (act.jiraKey && act.jiraKey.toLowerCase().includes(search.toLowerCase())) ||
      (act.description && act.description.toLowerCase().includes(search.toLowerCase()))

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
    setDescValue(act.description || "")
    setIsDescDirty(false)
    setIsDetailOpen(true)
    setCommentHeading("Status Update")
    setCommentText("")
    setActiveTab("comments")
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

  const handleSaveDescription = async () => {
    if (!selectedActivity) return
    try {
      await handleSaveDetailField("description", descValue)
      setIsDescDirty(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to save description")
    }
  }

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedActivity || !subtaskTitle.trim()) return
    setAddingSubtask(true)
    try {
      const res = await addActivitySubtask(selectedActivity.id, {
        title: subtaskTitle.trim(),
        assigneeName: subtaskAssignee || undefined,
      })
      if (res.error) throw new Error(res.error)
      toast.success("Sub-task added!")
      const newSubtask = (res as any).subtask
      setSelectedActivity((prev) => {
        if (!prev) return null
        const currentSubtasks = prev.subtasks || []
        return { ...prev, subtasks: [...currentSubtasks, newSubtask] }
      })
      setSubtaskTitle("")
      setSubtaskAssignee("")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to add sub-task")
    } finally {
      setAddingSubtask(false)
    }
  }

  const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
    if (!selectedActivity) return
    try {
      setSelectedActivity((prev) => {
        if (!prev) return null
        const currentSubtasks = (prev.subtasks || []).map((st) =>
          st.id === subtaskId ? { ...st, completed } : st
        )
        return { ...prev, subtasks: currentSubtasks }
      })

      const res = await toggleActivitySubtask(selectedActivity.id, subtaskId, completed)
      if (res.error) throw new Error(res.error)
      toast.success(completed ? "Sub-task completed" : "Sub-task reopened")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle sub-task")
    }
  }

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!selectedActivity) return
    try {
      setSelectedActivity((prev) => {
        if (!prev) return null
        const currentSubtasks = (prev.subtasks || []).filter((st) => st.id !== subtaskId)
        return { ...prev, subtasks: currentSubtasks }
      })

      const res = await deleteActivitySubtask(selectedActivity.id, subtaskId)
      if (res.error) throw new Error(res.error)
      toast.success("Sub-task removed")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete sub-task")
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

  // Active subtasks progress calculation
  const currentSubtasks = selectedActivity?.subtasks || []
  const completedSubtasksCount = currentSubtasks.filter((s) => s.completed).length
  const progressPercent = currentSubtasks.length > 0 ? Math.round((completedSubtasksCount / currentSubtasks.length) * 100) : 0

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
            className={`text-xs gap-1.5 h-8 ${viewMode === "board" ? "bg-indigo-600 text-white" : "text-muted-foreground"}`}
          >
            <Columns3 className="h-3.5 w-3.5" />
            <span>Jira Board</span>
          </Button>

          <Button
            size="sm"
            variant={viewMode === "backlog" ? "default" : "ghost"}
            onClick={() => setViewMode("backlog")}
            className={`text-xs gap-1.5 h-8 ${viewMode === "backlog" ? "bg-indigo-600 text-white" : "text-muted-foreground"}`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Sprint Backlog</span>
          </Button>

          <Button
            size="sm"
            variant={viewMode === "list" ? "default" : "ghost"}
            onClick={() => setViewMode("list")}
            className={`text-xs gap-1.5 h-8 ${viewMode === "list" ? "bg-indigo-600 text-white" : "text-muted-foreground"}`}
          >
            <List className="h-3.5 w-3.5" />
            <span>All Issues</span>
          </Button>
        </div>

        {/* Filters and New Issue Button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative min-w-[200px]">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search key, title, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs h-8 pl-8 glass border-white/10"
            />
          </div>

          {/* Assignee Filter */}
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="text-xs h-8 bg-background/50 border border-white/10 rounded-lg px-2 text-foreground"
          >
            <option value="ALL">All Assignees</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name || m.email}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs h-8 bg-background/50 border border-white/10 rounded-lg px-2 text-foreground"
          >
            <option value="ALL">All Types</option>
            <option value="TASK">Task</option>
            <option value="CALL">Call</option>
            <option value="MEETING">Meeting</option>
            <option value="EMAIL">Email</option>
            <option value="NOTE">Note</option>
          </select>

          {/* New Issue Button */}
          <Button
            onClick={() => setIsCreateOpen(true)}
            size="sm"
            className="h-8 gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Task</span>
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
                      const subtasks = Array.isArray(act.subtasks) ? act.subtasks : []
                      const completedSubtasks = subtasks.filter((s) => s.completed).length
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

                          {/* Bottom Row: Due date, Subtask progress, Comments count, Assignee avatar */}
                          <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] text-muted-foreground">
                            <div className="flex items-center gap-2">
                              {act.dueDate && (
                                <span
                                  className={`flex items-center gap-1 ${
                                    isOverdue ? "text-red-400 font-semibold" : "text-muted-foreground"
                                  }`}
                                >
                                  <Clock className="h-3 w-3" />
                                  {new Date(act.dueDate).toLocaleDateString("en-IN", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              )}

                              {subtasks.length > 0 && (
                                <span className="flex items-center gap-1 text-emerald-400 font-mono">
                                  <CheckSquare className="h-3 w-3" />
                                  <span>{completedSubtasks}/{subtasks.length}</span>
                                </span>
                              )}

                              {commentsCount > 0 && (
                                <span className="flex items-center gap-1 text-indigo-400">
                                  <MessageSquare className="h-3 w-3" />
                                  <span>{commentsCount}</span>
                                </span>
                              )}
                            </div>

                            {/* Assignee Avatar */}
                            {act.assignedTo ? (
                              <div
                                className="h-5 w-5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-[9px] flex items-center justify-center border border-indigo-500/30"
                                title={`Assigned to ${act.assignedTo.name || act.assignedTo.email}`}
                              >
                                {(act.assignedTo.name?.[0] || act.assignedTo.email[0]).toUpperCase()}
                              </div>
                            ) : (
                              <span className="text-[9px] text-muted-foreground/60">Unassigned</span>
                            )}
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
          VIEW 2: SPRINT BACKLOG & WORK PLANNING VIEW
          ───────────────────────────────────────────────────────────── */}
      {viewMode === "backlog" && (
        <div className="space-y-6">
          {/* Active Sprint Section */}
          <div className="p-4 rounded-2xl glass border border-white/10 space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">Current Sprint (In Flight)</span>
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  {filtered.filter((a) => a.status === "IN_PROGRESS" || a.status === "IN_REVIEW").length} issues
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">Sprint ends this Friday</span>
            </div>

            <div className="space-y-1.5">
              {filtered
                .filter((a) => a.status === "IN_PROGRESS" || a.status === "IN_REVIEW")
                .map((act) => (
                  <div
                    key={act.id}
                    onClick={() => handleOpenDetail(act)}
                    className="flex items-center justify-between p-2.5 rounded-xl glass border border-white/5 hover:border-indigo-500/30 bg-white/2 hover:bg-white/5 transition-all cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-3">
                      {renderPriorityIcon(act.priority)}
                      <span className="font-mono text-[11px] text-muted-foreground w-16">
                        {act.jiraKey || "CRM"}
                      </span>
                      <span className="font-semibold text-foreground">{act.title}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0.5 rounded-full ${
                          act.status === "IN_PROGRESS"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                        }`}
                      >
                        {act.status.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground w-28 truncate text-right">
                        {act.assignedTo?.name || "Unassigned"}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Product Backlog Section */}
          <div className="p-4 rounded-2xl glass border border-white/10 space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">Backlog & To Do</span>
                <Badge variant="outline" className="text-[10px] bg-white/5 text-muted-foreground">
                  {filtered.filter((a) => a.status === "BACKLOG" || a.status === "TODO").length} issues
                </Badge>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setCreateForm((p) => ({ ...p, status: "BACKLOG" }))
                  setIsCreateOpen(true)
                }}
                className="h-7 text-xs bg-white/10 hover:bg-white/15 text-foreground gap-1"
              >
                <Plus className="h-3 w-3" />
                <span>Create Backlog Item</span>
              </Button>
            </div>

            <div className="space-y-1.5">
              {filtered
                .filter((a) => a.status === "BACKLOG" || a.status === "TODO")
                .map((act) => (
                  <div
                    key={act.id}
                    onClick={() => handleOpenDetail(act)}
                    className="flex items-center justify-between p-2.5 rounded-xl glass border border-white/5 hover:border-white/15 bg-white/2 hover:bg-white/5 transition-all cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-3">
                      {renderPriorityIcon(act.priority)}
                      <span className="font-mono text-[11px] text-muted-foreground w-16">
                        {act.jiraKey || "CRM"}
                      </span>
                      <span className="text-foreground font-medium">{act.title}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => handleQuickStatusMove(e, act.id, "IN_PROGRESS")}
                        className="h-6 text-[10px] text-amber-400 hover:bg-amber-500/10 px-2"
                      >
                        Start Sprint ➔
                      </Button>
                      <span className="text-xs text-muted-foreground w-28 truncate text-right">
                        {act.assignedTo?.name || "Unassigned"}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW 3: ALL ISSUES LIST VIEW
          ───────────────────────────────────────────────────────────── */}
      {viewMode === "list" && (
        <div className="p-4 rounded-2xl glass border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-white/10 text-muted-foreground font-semibold">
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Key</th>
                  <th className="py-2.5 px-3">Summary</th>
                  <th className="py-2.5 px-3">Assignee</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((act) => (
                  <tr
                    key={act.id}
                    onClick={() => handleOpenDetail(act)}
                    className="hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-3">{renderTypeIcon(act.type)}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-indigo-400 font-semibold">
                      {act.jiraKey || "CRM"}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-foreground max-w-xs truncate">
                      {act.title}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">
                      {act.assignedTo?.name || act.assignedTo?.email || "Unassigned"}
                    </td>
                    <td className="py-2.5 px-3">{renderPriorityIcon(act.priority)}</td>
                    <td className="py-2.5 px-3">
                      <Badge variant="outline" className="text-[10px] font-semibold border-white/10">
                        {act.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">
                      {act.dueDate ? new Date(act.dueDate).toLocaleDateString("en-IN") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          JIRA ISSUE DETAIL DRAWER & EDIT MODAL
          ───────────────────────────────────────────────────────────── */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto glass border-white/10 rounded-2xl p-6">
          {selectedActivity && (
            <div className="space-y-6">
              {/* Header Bar */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  {renderTypeIcon(selectedActivity.type)}
                  <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    {selectedActivity.jiraKey || "CRM-TASK"}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {selectedActivity.status.replace(/_/g, " ")}
                  </Badge>
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
                {/* Left 2 Columns: Summary, Description, Sub-tasks, Activity Tabs */}
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

                  {/* Description with Jira Rich Markdown Editor */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] text-muted-foreground uppercase font-semibold">
                        Description & Acceptance Criteria
                      </Label>
                      {isDescDirty && (
                        <Button
                          size="sm"
                          onClick={handleSaveDescription}
                          className="h-6 px-2.5 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-sm"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Save Description
                        </Button>
                      )}
                    </div>
                    <JiraMarkdownEditor
                      value={descValue}
                      onChange={(newVal) => {
                        setDescValue(newVal)
                        setIsDescDirty(true)
                      }}
                      placeholder="Write description with **bold**, *italic*, [links](url), tables, code snippets..."
                      minHeight="min-h-[140px]"
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
                      JIRA SUB-TASKS MAPPING SECTION
                      ───────────────────────────────────────────────────────────── */}
                  <div className="space-y-3 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="h-4 w-4 text-emerald-400" />
                        <h4 className="text-sm font-bold text-foreground">
                          Sub-tasks ({currentSubtasks.length})
                        </h4>
                      </div>
                      {currentSubtasks.length > 0 && (
                        <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-mono">
                          {completedSubtasksCount} of {currentSubtasks.length} done ({progressPercent}%)
                        </span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    {currentSubtasks.length > 0 && (
                      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    )}

                    {/* Sub-tasks list */}
                    <div className="space-y-1.5">
                      {currentSubtasks.map((st: any) => (
                        <div
                          key={st.id}
                          className="flex items-center justify-between p-2.5 rounded-xl glass border border-white/5 hover:border-white/15 bg-white/[0.02] hover:bg-white/[0.05] transition-all group"
                        >
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={Boolean(st.completed)}
                              onChange={(e) => handleToggleSubtask(st.id, e.target.checked)}
                              className="h-4 w-4 rounded border-white/20 bg-white/10 text-emerald-500 focus:ring-0 cursor-pointer"
                            />
                            <span className="text-[10px] font-mono font-semibold text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded">
                              {st.key || "SUB"}
                            </span>
                            <span
                              className={cn(
                                "text-xs font-medium truncate",
                                st.completed ? "line-through text-muted-foreground" : "text-foreground"
                              )}
                            >
                              {st.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {st.assigneeName && (
                              <Badge variant="outline" className="text-[9px] bg-white/5 border-white/10">
                                {st.assigneeName}
                              </Badge>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteSubtask(st.id)}
                              className="h-6 w-6 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete sub-task"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Inline Add Sub-task Form */}
                    <form onSubmit={handleAddSubtask} className="flex items-center gap-2 pt-1">
                      <Input
                        value={subtaskTitle}
                        onChange={(e) => setSubtaskTitle(e.target.value)}
                        placeholder="Add a sub-task or checklist item..."
                        className="text-xs h-8 glass border-white/10 flex-1"
                      />
                      <select
                        value={subtaskAssignee}
                        onChange={(e) => setSubtaskAssignee(e.target.value)}
                        className="text-xs h-8 bg-background/50 border border-white/10 rounded-lg px-2 text-foreground max-w-[130px]"
                      >
                        <option value="">Unassigned</option>
                        {teamMembers.map((m) => (
                          <option key={m.id} value={m.name || m.email}>
                            {m.name || m.email}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={addingSubtask || !subtaskTitle.trim()}
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-1 px-3 shadow-sm"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Sub-task</span>
                      </Button>
                    </form>
                  </div>

                  {/* ─────────────────────────────────────────────────────────────
                      JIRA ACTIVITY SECTION: COMMENTS & HISTORY TABS
                      ───────────────────────────────────────────────────────────── */}
                  <div className="space-y-4 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab("comments")}
                          className={cn(
                            "px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5",
                            activeTab === "comments"
                              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>Comments ({(selectedActivity.comments || []).length})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveTab("history")}
                          className={cn(
                            "px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5",
                            activeTab === "history"
                              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <History className="h-3.5 w-3.5" />
                          <span>History & Changelog ({(selectedActivity.history || []).length})</span>
                        </button>
                      </div>
                    </div>

                    {activeTab === "comments" ? (
                      /* Comments Thread and Add Comment Form */
                      <div className="space-y-4">
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
                                <div className="text-xs text-foreground/90 pl-8 pt-0.5">
                                  <JiraMarkdownViewer content={comm.text} />
                                </div>
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
                              className="text-xs min-h-[70px] glass border-white/10 resize-none font-sans"
                            />
                          </div>

                          <div className="flex justify-end">
                            <Button
                              type="submit"
                              size="sm"
                              disabled={postingComment || !commentText.trim()}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5 h-8 shadow-sm"
                            >
                              <Send className="h-3.5 w-3.5" />
                              <span>Save Comment</span>
                            </Button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      /* History & Changelog */
                      <div className="space-y-2.5">
                        {(selectedActivity.history || []).length === 0 ? (
                          <p className="text-xs text-muted-foreground italic py-3">
                            No history recorded yet. Updates to status, priority, description, or sub-tasks will automatically log here.
                          </p>
                        ) : (
                          (selectedActivity.history || []).map((h: any, idx: number) => (
                            <div
                              key={h.id || idx}
                              className="p-3 rounded-xl bg-white/3 border border-white/5 flex items-start gap-3 text-xs"
                            >
                              <div className="h-6 w-6 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                {(h.authorName?.[0] || "U").toUpperCase()}
                              </div>
                              <div className="flex-1 space-y-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold text-foreground">
                                      {h.authorName || "Team Member"}
                                    </span>
                                    <span className="text-muted-foreground">updated</span>
                                    <Badge variant="outline" className="text-[9px] bg-white/5 border-white/10 uppercase font-mono">
                                      {h.field || "FIELD"}
                                    </Badge>
                                  </div>
                                  <span className="text-[10px] text-muted-foreground shrink-0">
                                    {h.createdAt
                                      ? new Date(h.createdAt).toLocaleString("en-IN", {
                                          month: "short",
                                          day: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      : "Just now"}
                                  </span>
                                </div>

                                {h.from && h.to ? (
                                  <p className="text-muted-foreground text-[11px]">
                                    <span className="line-through opacity-70">{h.from}</span>
                                    <span className="mx-1.5 text-indigo-400 font-bold">➔</span>
                                    <span className="font-semibold text-foreground">{h.to}</span>
                                  </p>
                                ) : (
                                  <p className="text-muted-foreground text-[11px]">{h.to || h.text}</p>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
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
        <DialogContent className="sm:max-w-xl glass border-white/10 rounded-2xl p-6">
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
                <Label className="text-xs font-semibold">Assignee</Label>
                <select
                  value={createForm.assignedToId}
                  onChange={(e) => setCreateForm({ ...createForm, assignedToId: e.target.value })}
                  className="w-full text-xs mt-1 bg-background/50 border border-white/10 rounded-lg p-2 text-foreground"
                >
                  <option value="">-- Unassigned --</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Priority</Label>
                <select
                  value={createForm.priority}
                  onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value as any })}
                  className="w-full text-xs mt-1 bg-background/50 border border-white/10 rounded-lg p-2 text-foreground font-semibold"
                >
                  <option value="HIGHEST">🔴 Highest</option>
                  <option value="HIGH">🟠 High</option>
                  <option value="MEDIUM">🟡 Medium</option>
                  <option value="LOW">🔵 Low</option>
                  <option value="LOWEST">⚪ Lowest</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Initial Status</Label>
                <select
                  value={createForm.status}
                  onChange={(e) => setCreateForm({ ...createForm, status: e.target.value as any })}
                  className="w-full text-xs mt-1 bg-background/50 border border-white/10 rounded-lg p-2 text-foreground"
                >
                  <option value="BACKLOG">Backlog</option>
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="DONE">Done</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Activity Type</Label>
                <select
                  value={createForm.type}
                  onChange={(e) => setCreateForm({ ...createForm, type: e.target.value as any })}
                  className="w-full text-xs mt-1 bg-background/50 border border-white/10 rounded-lg p-2 text-foreground"
                >
                  <option value="TASK">Task</option>
                  <option value="CALL">Call</option>
                  <option value="MEETING">Meeting</option>
                  <option value="EMAIL">Email</option>
                  <option value="NOTE">Note</option>
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

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Description (Markdown Supported)</Label>
              <JiraMarkdownEditor
                value={createForm.description}
                onChange={(val) => setCreateForm({ ...createForm, description: val })}
                placeholder="Key details, acceptance criteria, tables, and code snippets..."
                minHeight="min-h-[100px]"
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
                {creating ? "Creating Issue..." : "Create Issue"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
