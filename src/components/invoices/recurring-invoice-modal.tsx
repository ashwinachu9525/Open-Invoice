"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { CalendarClock, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { createOrUpdateSchedule, deleteSchedule } from "@/actions/schedule"

interface RecurringInvoiceModalProps {
  invoiceId: string
  existingSchedule?: {
    frequency: string
    nextRunAt: Date
    autoSend: boolean
    status: string
  } | null
}

export function RecurringInvoiceModal({ invoiceId, existingSchedule }: RecurringInvoiceModalProps) {
  const [open, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [frequency, setFrequency] = useState(existingSchedule?.frequency || "MONTHLY")
  
  // Parse existing date to YYYY-MM-DD
  const existingDate = existingSchedule?.nextRunAt ? new Date(existingSchedule.nextRunAt) : new Date()
  const initialDateStr = existingDate.toISOString().split("T")[0]
  const [startDate, setStartDate] = useState(initialDateStr)
  
  // Parse hour
  const initialHourStr = existingDate.getHours().toString().padStart(2, "0") + ":00"
  const [timeStr, setTimeStr] = useState(initialHourStr)

  const [autoSend, setAutoSend] = useState(existingSchedule?.autoSend || false)

  async function handleSave() {
    setIsSaving(true)
    try {
      // Combine date and time
      const [year, month, day] = startDate.split("-")
      const [hour, minute] = timeStr.split(":")
      
      const nextRunAt = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute)
      )

      const result = await createOrUpdateSchedule({
        invoiceId,
        frequency,
        nextRunAt,
        autoSend
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Recurring schedule saved successfully!")
        setOpen(false)
      }
    } catch (e) {
      toast.error("Failed to save schedule")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="outline" size="sm" className="glass border-white/10 hover:bg-white/8 gap-1.5">
          <CalendarClock className="h-4 w-4" />
          {existingSchedule ? "Edit Schedule" : "Make Recurring"}
        </Button>
      } />
      <DialogContent className="sm:max-w-[425px] border-white/10 bg-black/60 backdrop-blur-xl text-white">
        <DialogHeader>
          <DialogTitle>Configure Recurring Invoice</DialogTitle>
          <DialogDescription className="text-gray-400">
            Automatically generate this invoice at a regular interval.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="frequency">Frequency</Label>
            <Select value={frequency} onValueChange={(val) => { if (val) setFrequency(val) }}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
                <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                <SelectItem value="HALF_YEARLY">Half Yearly</SelectItem>
                <SelectItem value="YEARLY">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startDate">Next Generate Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="timeStr">Time (Hourly)</Label>
              <Input
                id="timeStr"
                type="time"
                step="3600"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 p-3 border border-white/10 rounded-lg bg-white/5">
            <div className="space-y-0.5">
              <Label className="text-base">Auto Send Email</Label>
              <p className="text-sm text-gray-400">
                Automatically email the invoice to the customer when generated.
              </p>
            </div>
            <Switch checked={autoSend} onCheckedChange={setAutoSend} />
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          {existingSchedule ? (
            <Button variant="destructive" onClick={async () => {
              setIsSaving(true)
              try {
                const res = await deleteSchedule(invoiceId)
                if (res.error) toast.error(res.error)
                else {
                  toast.success("Schedule removed")
                  setOpen(false)
                }
              } finally { setIsSaving(false) }
            }} disabled={isSaving} className="gap-1.5">
              <Trash2 className="h-4 w-4" /> Remove
            </Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Schedule"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
