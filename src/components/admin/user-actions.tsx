"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { changeUserRole, toggleUserBlock, toggleUserPro } from "@/actions/admin-tools"
import { toast } from "sonner"
import { Loader2, ShieldAlert, ShieldCheck, Award, Lock } from "lucide-react"

interface UserActionsProps {
  userId: string
  isPro: boolean
  isBlocked: boolean
  currentRole: string
}

export function UserActions({ userId, isPro, isBlocked, currentRole }: UserActionsProps) {
  const [loading, setLoading] = useState<"role" | "block" | "pro" | null>(null)
  const [password, setPassword] = useState("")

  // Role Change state & dialog control
  const [targetRole, setTargetRole] = useState<string>(currentRole)
  const [isRoleOpen, setIsRoleOpen] = useState(false)

  // Block/Unblock dialog control
  const [isBlockOpen, setIsBlockOpen] = useState(false)

  // Pro/Free dialog control
  const [isProOpen, setIsProOpen] = useState(false)

  async function handleRoleChange() {
    if (!password) {
      toast.error("Please enter the SQL Admin password.")
      return
    }
    setLoading("role")
    try {
      const res = await changeUserRole(userId, targetRole, password)
      if (res.success) {
        toast.success(res.message || "User role updated.")
        setIsRoleOpen(false)
        setPassword("")
      } else {
        toast.error(res.error || "Failed to update role.")
      }
    } catch {
      toast.error("An error occurred.")
    } finally {
      setLoading(null)
    }
  }

  async function handleBlockToggle() {
    if (!password) {
      toast.error("Please enter the SQL Admin password.")
      return
    }
    setLoading("block")
    try {
      const res = await toggleUserBlock(userId, isBlocked, password)
      if (res.success) {
        toast.success(res.message || "User block status updated.")
        setIsBlockOpen(false)
        setPassword("")
      } else {
        toast.error(res.error || "Failed to update block status.")
      }
    } catch {
      toast.error("An error occurred.")
    } finally {
      setLoading(null)
    }
  }

  async function handleProToggle() {
    if (!password) {
      toast.error("Please enter the SQL Admin password.")
      return
    }
    setLoading("pro")
    try {
      const res = await toggleUserPro(userId, isPro, password)
      if (res.success) {
        toast.success(res.message || "User Pro status updated.")
        setIsProOpen(false)
        setPassword("")
      } else {
        toast.error(res.error || "Failed to update Pro status.")
      }
    } catch {
      toast.error("An error occurred.")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex items-center justify-end gap-2.5">
      {/* ── Role Control ── */}
      <Select
        value={targetRole}
        onValueChange={(val) => {
          if (val) {
            setTargetRole(val)
            setIsRoleOpen(true)
          }
        }}
      >
        <SelectTrigger className="w-[140px] h-8 bg-slate-950 border-slate-800 text-xs">
          <SelectValue placeholder="Select Role" />
        </SelectTrigger>
        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
          <SelectItem value="MEMBER">Member</SelectItem>
          <SelectItem value="BUSINESS_OWNER">Business Owner</SelectItem>
          <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
        </SelectContent>
      </Select>

      <AlertDialog open={isRoleOpen} onOpenChange={setIsRoleOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100 flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-500" /> Change User Role?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to change this user's role to <strong>{targetRole}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2 space-y-2">
            <Label htmlFor="role-password">Admin SQL Password Required</Label>
            <Input
              id="role-password"
              type="password"
              placeholder="Enter SQL admin password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-slate-950 border-slate-850 text-slate-100 focus-visible:ring-amber-500/50"
            />
          </div>
          <AlertDialogFooter className="flex gap-2 justify-end">
            <AlertDialogCancel
              onClick={() => {
                setTargetRole(currentRole)
                setPassword("")
              }}
              className="border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRoleChange}
              disabled={loading === "role" || !password}
              className="bg-amber-600 hover:bg-amber-700 text-slate-100"
            >
              {loading === "role" ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Pro Control ── */}
      <AlertDialog open={isProOpen} onOpenChange={setIsProOpen}>
        <AlertDialogTrigger render={
          <Button
            size="sm"
            variant={isPro ? "outline" : "secondary"}
            onClick={() => setIsProOpen(true)}
            className="h-8 text-xs border-slate-800 hover:bg-slate-800"
          >
            {isPro ? "Revoke Pro" : "Make Pro"}
          </Button>
        } />
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100 flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-400" />
              {isPro ? "Revoke Pro status?" : "Grant Pro status?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {isPro
                ? "This will downgrade the user and their company's subscription tier back to FREE."
                : "This will upgrade the user and their company's subscription tier to PRO."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2 space-y-2">
            <Label htmlFor="pro-password">Admin SQL Password Required</Label>
            <Input
              id="pro-password"
              type="password"
              placeholder="Enter SQL admin password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-slate-950 border-slate-850 text-slate-100 focus-visible:ring-indigo-500/50"
            />
          </div>
          <AlertDialogFooter className="flex gap-2 justify-end">
            <AlertDialogCancel
              onClick={() => setPassword("")}
              className="border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleProToggle}
              disabled={loading === "pro" || !password}
              className={isPro ? "bg-rose-600 hover:bg-rose-700 text-slate-100" : "bg-indigo-600 hover:bg-indigo-700 text-slate-100"}
            >
              {loading === "pro" ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              {isPro ? "Revoke Plan" : "Grant Pro"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Block Control ── */}
      <AlertDialog open={isBlockOpen} onOpenChange={setIsBlockOpen}>
        <AlertDialogTrigger render={
          <Button
            size="sm"
            variant={isBlocked ? "outline" : "destructive"}
            onClick={() => setIsBlockOpen(true)}
            className="h-8 text-xs border-slate-800"
          >
            {isBlocked ? "Unblock" : "Block"}
          </Button>
        } />
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100 flex items-center gap-2">
              {isBlocked ? <ShieldCheck className="w-5 h-5 text-emerald-500" /> : <ShieldAlert className="w-5 h-5 text-rose-500" />}
              {isBlocked ? "Unblock User Account?" : "Block User Account?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {isBlocked
                ? "This will restore the user's login access to the platform."
                : "This will suspend the user's account. They will be immediately blocked from signing in."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2 space-y-2">
            <Label htmlFor="block-password">Admin SQL Password Required</Label>
            <Input
              id="block-password"
              type="password"
              placeholder="Enter SQL admin password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-slate-950 border-slate-850 text-slate-100 focus-visible:ring-rose-500/50"
            />
          </div>
          <AlertDialogFooter className="flex gap-2 justify-end">
            <AlertDialogCancel
              onClick={() => setPassword("")}
              className="border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlockToggle}
              disabled={loading === "block" || !password}
              className={isBlocked ? "bg-emerald-600 hover:bg-emerald-700 text-slate-100" : "bg-rose-600 hover:bg-rose-700 text-slate-100"}
            >
              {loading === "block" ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              {isBlocked ? "Unblock Account" : "Block Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
