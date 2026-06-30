"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { pauseRecurringSchedule, resumeRecurringSchedule, cancelRecurringSchedule } from "@/actions/recurring"
import { toast } from "sonner"
import { CalendarClock, Play, Pause, XCircle, ExternalLink, Mail, MailWarning } from "lucide-react"
import Link from "next/link"

interface RecurringSchedulesListProps {
  initialSchedules: any[]
}

const statusConfig: Record<string, { label: string; class: string }> = {
  ACTIVE:    { label: "Active",    class: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" },
  PAUSED:    { label: "Paused",    class: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" },
  CANCELLED: { label: "Cancelled", class: "bg-red-500/20 text-red-400 border border-red-500/30" },
}

export function RecurringSchedulesList({ initialSchedules }: RecurringSchedulesListProps) {
  const [schedules, setSchedules] = useState<any[]>(initialSchedules)
  const [pendingId, setPendingId] = useState<string | null>(null)

  async function handlePause(invoiceId: string) {
    setPendingId(invoiceId)
    try {
      const res = await pauseRecurringSchedule(invoiceId)
      if (res.success) {
        setSchedules(prev => prev.map(s => s.invoiceId === invoiceId ? { ...s, status: "PAUSED" } : s))
        toast.success("Schedule paused successfully")
      } else {
        toast.error(res.error || "Failed to pause schedule")
      }
    } catch {
      toast.error("Error pausing schedule")
    } finally {
      setPendingId(null)
    }
  }

  async function handleResume(invoiceId: string) {
    setPendingId(invoiceId)
    try {
      const res = await resumeRecurringSchedule(invoiceId)
      if (res.success) {
        setSchedules(prev => prev.map(s => s.invoiceId === invoiceId ? { ...s, status: "ACTIVE" } : s))
        toast.success("Schedule resumed successfully")
      } else {
        toast.error(res.error || "Failed to resume schedule")
      }
    } catch {
      toast.error("Error resuming schedule")
    } finally {
      setPendingId(null)
    }
  }

  async function handleCancel(invoiceId: string) {
    setPendingId(invoiceId)
    try {
      const res = await cancelRecurringSchedule(invoiceId)
      if (res.success) {
        setSchedules(prev => prev.map(s => s.invoiceId === invoiceId ? { ...s, status: "CANCELLED" } : s))
        toast.success("Schedule cancelled successfully")
      } else {
        toast.error(res.error || "Failed to cancel schedule")
      }
    } catch {
      toast.error("Error cancelling schedule")
    } finally {
      setPendingId(null)
    }
  }

  if (schedules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
          <CalendarClock className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="font-medium text-slate-200">No recurring schedules found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Open any existing invoice detail page and click "Make Recurring" to create a schedule.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-white/8 hover:bg-transparent">
            <TableHead className="text-slate-300">Template Invoice</TableHead>
            <TableHead className="text-slate-300">Customer</TableHead>
            <TableHead className="text-slate-300">Frequency</TableHead>
            <TableHead className="text-slate-300">Next Run Date</TableHead>
            <TableHead className="text-slate-300">Auto Send Email</TableHead>
            <TableHead className="text-slate-300">Status</TableHead>
            <TableHead className="text-slate-300 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedules.map((sch) => {
            const status = statusConfig[sch.status] || { label: sch.status, class: "" }
            return (
              <TableRow key={sch.id} className="border-b border-white/5 hover:bg-white/5">
                <TableCell className="font-medium">
                  <Link href={`/invoices/${sch.invoiceId}`} className="text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1">
                    {sch.invoice.invoiceNumber}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </TableCell>
                <TableCell className="text-slate-300">{sch.invoice.customer.name}</TableCell>
                <TableCell className="font-mono text-xs text-slate-300">{sch.frequency}</TableCell>
                <TableCell className="text-slate-300">
                  {new Date(sch.nextRunAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </TableCell>
                <TableCell>
                  {sch.autoSend ? (
                    <span className="flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                      <Mail className="h-3.5 w-3.5" /> Yes
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-slate-400 text-xs font-semibold">
                      <MailWarning className="h-3.5 w-3.5" /> No
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${status.class}`}>
                    {status.label}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1.5">
                    {sch.status === "ACTIVE" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePause(sch.invoiceId)}
                        disabled={pendingId === sch.invoiceId}
                        className="h-8 text-yellow-400 hover:text-yellow-350 hover:bg-yellow-400/10 gap-1"
                      >
                        <Pause className="h-3.5 w-3.5" /> Pause
                      </Button>
                    )}
                    {sch.status === "PAUSED" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResume(sch.invoiceId)}
                        disabled={pendingId === sch.invoiceId}
                        className="h-8 text-emerald-400 hover:text-emerald-350 hover:bg-emerald-400/10 gap-1"
                      >
                        <Play className="h-3.5 w-3.5" /> Resume
                      </Button>
                    )}
                    {sch.status !== "CANCELLED" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancel(sch.invoiceId)}
                        disabled={pendingId === sch.invoiceId}
                        className="h-8 text-red-400 hover:text-red-350 hover:bg-red-400/10 gap-1"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Cancel
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
