"use client"

import { useState } from "react"
import { updateCustomerCrmStatus } from "@/actions/crm"
import { toast } from "sonner"
import { CheckCircle2, UserCheck, Flame, UserMinus, Loader2 } from "lucide-react"

const STAGES = [
  { value: "LEAD", label: "Lead", icon: Flame, color: "text-amber-400 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15" },
  { value: "PROSPECT", label: "Prospect", icon: CheckCircle2, color: "text-blue-400 bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/15" },
  { value: "ACTIVE", label: "Active", icon: UserCheck, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15" },
  { value: "INACTIVE", label: "Inactive", icon: UserMinus, color: "text-slate-400 bg-slate-500/10 border-slate-500/20 hover:bg-slate-500/15" },
]

interface CrmStatusPickerProps {
  customerId: string
  currentStatus: string
}

export function CrmStatusPicker({ customerId, currentStatus }: CrmStatusPickerProps) {
  const [status, setStatus] = useState(currentStatus)
  const [loading, setLoading] = useState<string | null>(null)

  async function handleStatusChange(newStatus: string) {
    if (newStatus === status) return
    setLoading(newStatus)
    try {
      const res = await updateCustomerCrmStatus(customerId, newStatus)
      if (res.error) {
        toast.error(res.error)
      } else {
        setStatus(newStatus)
        toast.success(`Customer status updated to ${newStatus}`)
      }
    } catch {
      toast.error("Failed to update status")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">CRM Lifecycle Status</span>
      <div className="grid grid-cols-4 gap-2">
        {STAGES.map((stage) => {
          const Icon = stage.icon
          const isActive = status === stage.value
          const isLoading = loading === stage.value

          return (
            <button
              key={stage.value}
              onClick={() => handleStatusChange(stage.value)}
              disabled={loading !== null}
              className={`flex flex-col sm:flex-row items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                isActive
                  ? "bg-indigo-600/15 border-indigo-500/50 text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.1)]"
                  : "bg-white/3 border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10"
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              ) : (
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-indigo-400" : "text-slate-500"}`} />
              )}
              <span>{stage.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
