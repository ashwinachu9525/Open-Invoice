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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updateCompanySubscription } from "@/actions/admin-tools"
import { toast } from "sonner"
import { Loader2, Settings2, Lock } from "lucide-react"

interface AdminCompanyActionsProps {
  companyId: string
  currentTier: string
  trialEndsAt: Date | null
}

export function AdminCompanyActions({ companyId, currentTier, trialEndsAt }: AdminCompanyActionsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tier, setTier] = useState(currentTier)
  const [endsAt, setEndsAt] = useState<string>(
    trialEndsAt ? new Date(trialEndsAt).toISOString().split("T")[0] : ""
  )
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!password) {
      toast.error("Please enter the SQL Admin password.")
      return
    }
    setLoading(true)
    try {
      const res = await updateCompanySubscription(
        companyId,
        tier,
        endsAt || null,
        password
      )
      if (res.success) {
        toast.success(res.message || "Subscription updated successfully.")
        setIsOpen(false)
        setPassword("")
      } else {
        toast.error(res.error || "Failed to update subscription.")
      }
    } catch {
      toast.error("An error occurred.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-8 border-indigo-500/20 hover:border-indigo-500/50 hover:bg-indigo-500/5 text-indigo-400"
        >
          <Settings2 className="w-3.5 h-3.5 mr-1.5" />
          Manage Plan
        </Button>
      } />
      <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-indigo-400" /> Manage Company Plan
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Override the subscription plan and manually adjust the expiration date for this company.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="tier" className="text-slate-300 font-medium">Subscription Tier</Label>
            <Select value={tier} onValueChange={(val) => val && setTier(val)}>
              <SelectTrigger id="tier" className="bg-slate-950 border-slate-800 text-slate-100">
                <SelectValue placeholder="Select tier" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                <SelectItem value="FREE">FREE</SelectItem>
                <SelectItem value="PRO">PRO</SelectItem>
                <SelectItem value="ENTERPRISE">ENTERPRISE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="endsAt" className="text-slate-300 font-medium">Expiration Date (Optional)</Label>
            <Input
              id="endsAt"
              type="date"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="bg-slate-950 border-slate-800 text-slate-100 focus-visible:ring-indigo-500/50"
            />
          </div>
          <div className="flex flex-col gap-2 border-t border-slate-850 pt-3 mt-1">
            <Label htmlFor="comp-password" className="text-slate-300 font-medium flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-500" /> Admin SQL Password Required
            </Label>
            <Input
              id="comp-password"
              type="password"
              placeholder="Enter SQL admin password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-slate-950 border-slate-850 text-slate-100 focus-visible:ring-indigo-500/50"
            />
          </div>
        </div>
        <DialogFooter className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setIsOpen(false)
              setPassword("")
            }}
            className="border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading || !password}
            className="bg-indigo-600 hover:bg-indigo-700 text-slate-100"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Save Overrides
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
