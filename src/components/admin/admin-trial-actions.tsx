"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { extendTrial, adminStartTrial, adminRemoveTrial } from "@/actions/trial"
import { toast } from "sonner"
import { Plus, Trash2, Calendar, Loader2, RefreshCcw } from "lucide-react"

interface AdminTrialActionsProps {
  companyId: string
  hasTrial: boolean
  subscriptionTier: string
}

export function AdminTrialActions({ companyId, hasTrial, subscriptionTier }: AdminTrialActionsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [trialDays, setTrialDays] = useState(30)
  const [loading, setLoading] = useState<"add" | "remove" | "extend" | null>(null)

  async function handleStartTrial() {
    if (trialDays <= 0) {
      toast.error("Please enter a valid number of days.")
      return
    }
    setLoading("add")
    try {
      const res = await adminStartTrial(companyId, trialDays)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(res.message)
        setIsDialogOpen(false)
      }
    } catch {
      toast.error("Failed to start trial")
    } finally {
      setLoading(null)
    }
  }

  async function handleExtendTrial() {
    setLoading("extend")
    try {
      const res = await extendTrial(companyId, 7) // default 7 days extension
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(res.message)
      }
    } catch {
      toast.error("Failed to extend trial")
    } finally {
      setLoading(null)
    }
  }

  async function handleRemoveTrial() {
    setLoading("remove")
    try {
      const res = await adminRemoveTrial(companyId)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(res.message)
      }
    } catch {
      toast.error("Failed to remove trial")
    } finally {
      setLoading(null)
    }
  }

  // If already paid subscriber and no active trial, don't allow starting trial
  if (!hasTrial && (subscriptionTier === "PRO" || subscriptionTier === "ENTERPRISE")) {
    return (
      <span className="text-xs text-muted-foreground font-medium italic">
        Paid {subscriptionTier} Tier
      </span>
    )
  }

  if (hasTrial) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExtendTrial}
          disabled={loading !== null}
          className="text-xs h-8 border-indigo-500/20 hover:border-indigo-500/50 hover:bg-indigo-500/5 text-slate-200"
        >
          {loading === "extend" ? (
            <RefreshCcw className="w-3.5 h-3.5 animate-spin mr-1.5" />
          ) : (
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
          )}
          Extend 7d
        </Button>
        <AlertDialog>
          <AlertDialogTrigger render={
            <Button
              variant="outline"
              size="sm"
              disabled={loading !== null}
              className="text-xs h-8 border-rose-500/20 hover:border-rose-500/50 hover:bg-rose-500/5 text-rose-400"
            >
              {loading === "remove" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              )}
              Remove
            </Button>
          } />
          <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-slate-100">Remove Trial?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                Are you sure you want to remove the trial for this company? They will revert to their base plan status.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex gap-2 justify-end">
              <AlertDialogCancel className="border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemoveTrial}
                className="bg-rose-600 hover:bg-rose-700 text-slate-100"
              >
                Remove Trial
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger render={
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-8 border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/5 text-emerald-400"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Trial
        </Button>
      } />
      <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-100">Add TRIAL (PRO) Plan</DialogTitle>
          <DialogDescription className="text-slate-400">
            Set the trial duration for this company. They will get immediate access to PRO features.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="days" className="text-slate-300 font-medium">Trial Duration (Days)</Label>
            <Input
              id="days"
              type="number"
              value={trialDays}
              onChange={(e) => setTrialDays(parseInt(e.target.value) || 0)}
              className="bg-slate-950 border-slate-800 text-slate-100 focus-visible:ring-emerald-500/50"
            />
          </div>
          <div className="flex gap-2">
            {[14, 30, 60, 90].map((d) => (
              <Button
                key={d}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTrialDays(d)}
                className={`flex-1 text-xs bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-300 ${
                  trialDays === d ? "border-emerald-500 text-emerald-400 bg-emerald-500/5" : ""
                }`}
              >
                {d} Days
              </Button>
            ))}
          </div>
        </div>
        <DialogFooter className="flex gap-2 sm:gap-0 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsDialogOpen(false)}
            className="border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleStartTrial}
            disabled={loading !== null}
            className="bg-emerald-600 hover:bg-emerald-700 text-slate-100"
          >
            {loading === "add" && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Confirm & Start
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
