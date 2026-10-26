"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
} from "lucide-react"
import { toast } from "sonner"
import { updateActivityStatus, deleteActivity } from "@/actions/crm"

interface ActivitiesViewProps {
  initialActivities: any[]
}

export function ActivitiesView({ initialActivities }: ActivitiesViewProps) {
  const router = useRouter()
  const [search, setSearch] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState("ALL")
  const [statusFilter, setStatusFilter] = React.useState("ALL")

  const filtered = initialActivities.filter((act) => {
    const matchesSearch =
      !search ||
      act.title.toLowerCase().includes(search.toLowerCase()) ||
      (act.description && act.description.toLowerCase().includes(search.toLowerCase())) ||
      (act.customer && act.customer.name.toLowerCase().includes(search.toLowerCase()))

    const matchesType = typeFilter === "ALL" || act.type === typeFilter
    const matchesStatus = statusFilter === "ALL" || act.status === statusFilter
    return matchesSearch && matchesType && matchesStatus
  })

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED"
    try {
      const res = await updateActivityStatus(id, newStatus)
      if (res.error) throw new Error(res.error)
      toast.success(newStatus === "COMPLETED" ? "Activity marked completed!" : "Re-opened activity")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to update activity")
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await deleteActivity(id)
      if (res.error) throw new Error(res.error)
      toast.success("Activity removed")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete")
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Filters Bar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks, calls, meetings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 rounded-xl glass border-white/10 text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 px-3 text-xs bg-background/50 border border-white/10 rounded-xl text-foreground"
          >
            <option value="ALL">All Activity Types</option>
            <option value="TASK">Tasks</option>
            <option value="CALL">Calls</option>
            <option value="MEETING">Meetings</option>
            <option value="EMAIL">Emails</option>
            <option value="NOTE">Notes</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 text-xs bg-background/50 border border-white/10 rounded-xl text-foreground"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Only</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {/* ── Activities List ── */}
      {filtered.length === 0 ? (
        <Card className="glass border-white/10 p-12 text-center">
          <CalendarCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <h3 className="text-base font-semibold text-foreground">No activities found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Schedule a follow-up call, client meeting, or task using the "+ New" menu.
          </p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((act) => {
            const isCompleted = act.status === "COMPLETED"
            const isOverdue = !isCompleted && act.dueDate && new Date(act.dueDate) < new Date()

            return (
              <div
                key={act.id}
                className={`p-3.5 rounded-2xl glass border border-white/10 transition-all flex items-start justify-between gap-3 ${
                  isCompleted ? "opacity-70 bg-white/2" : "hover:border-white/20"
                }`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => handleToggleStatus(act.id, act.status)}
                    className="mt-0.5 shrink-0 text-muted-foreground hover:text-emerald-400 transition-colors"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-white/20 hover:border-emerald-400 transition-colors" />
                    )}
                  </button>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-bold ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {act.title}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-white/15">
                        {act.type}
                      </Badge>
                      {isOverdue && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-semibold">
                          Overdue
                        </span>
                      )}
                    </div>

                    {act.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {act.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1 flex-wrap">
                      {act.customer && (
                        <span className="flex items-center gap-1">
                          <Building className="h-3 w-3 text-muted-foreground" />
                          <span>{act.customer.companyName || act.customer.name}</span>
                        </span>
                      )}
                      {act.deal && (
                        <span className="flex items-center gap-1 text-emerald-400 font-medium">
                          <Briefcase className="h-3 w-3" />
                          <span>{act.deal.title}</span>
                        </span>
                      )}
                      {act.lead && (
                        <span className="flex items-center gap-1 text-purple-400 font-medium">
                          <Target className="h-3 w-3" />
                          <span>Lead: {act.lead.name}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {act.dueDate && (
                    <div className="text-right text-xs">
                      <span className="text-[10px] text-muted-foreground block">Due</span>
                      <span className={`font-semibold ${isOverdue ? "text-red-400" : "text-foreground"}`}>
                        {new Date(act.dueDate).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(act.id)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
