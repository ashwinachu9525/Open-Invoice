"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus,
  Target,
  UserPlus,
  Briefcase,
  CalendarCheck,
  Workflow,
  LayoutDashboard,
  Sparkles,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { createLead, createDeal, createCrmContact, createCrmActivity, createCrmWorkflow } from "@/actions/crm"

export function CrmQuickCreate() {
  const router = useRouter()
  const [activeModal, setActiveModal] = React.useState<
    "lead" | "contact" | "deal" | "task" | "workflow" | "dashboard" | null
  >(null)
  const [loading, setLoading] = React.useState(false)

  // Form states
  const [leadForm, setLeadForm] = React.useState({
    name: "",
    companyName: "",
    email: "",
    phone: "",
    region: "",
    estimatedValue: "",
    notes: "",
  })

  const [contactForm, setContactForm] = React.useState({
    name: "",
    companyName: "",
    email: "",
    phone: "",
    state: "",
  })

  const [dealForm, setDealForm] = React.useState({
    title: "",
    value: "",
    notes: "",
  })

  const [taskForm, setTaskForm] = React.useState({
    title: "",
    type: "TASK" as "CALL" | "EMAIL" | "MEETING" | "TASK",
    dueDate: "",
    description: "",
  })

  const [workflowForm, setWorkflowForm] = React.useState({
    name: "",
    description: "",
    triggerType: "LEAD_CREATED",
  })

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!leadForm.name) {
      toast.error("Lead name is required")
      return
    }
    setLoading(true)
    try {
      const res = await createLead({
        name: leadForm.name,
        companyName: leadForm.companyName,
        email: leadForm.email,
        phone: leadForm.phone,
        region: leadForm.region,
        estimatedValue: Number(leadForm.estimatedValue) || undefined,
        notes: leadForm.notes,
      })
      if (res.error) throw new Error(res.error)
      toast.success("Lead captured successfully!")
      setActiveModal(null)
      setLeadForm({ name: "", companyName: "", email: "", phone: "", region: "", estimatedValue: "", notes: "" })
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to create lead")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contactForm.name) {
      toast.error("Contact name is required")
      return
    }
    setLoading(true)
    try {
      const res = await createCrmContact(contactForm)
      if (res.error) throw new Error(res.error)
      toast.success("Contact saved successfully!")
      setActiveModal(null)
      setContactForm({ name: "", companyName: "", email: "", phone: "", state: "" })
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to create contact")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dealForm.title) {
      toast.error("Deal title is required")
      return
    }
    setLoading(true)
    try {
      const res = await createDeal({
        title: dealForm.title,
        value: Number(dealForm.value) || 0,
        notes: dealForm.notes,
      })
      if (res.error) throw new Error(res.error)
      toast.success("Deal created in pipeline!")
      setActiveModal(null)
      setDealForm({ title: "", value: "", notes: "" })
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to create deal")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskForm.title) {
      toast.error("Title is required")
      return
    }
    setLoading(true)
    try {
      const res = await createCrmActivity({
        type: taskForm.type,
        title: taskForm.title,
        dueDate: taskForm.dueDate || null,
        description: taskForm.description,
      })
      if (res.error) throw new Error(res.error)
      toast.success("Activity scheduled!")
      setActiveModal(null)
      setTaskForm({ title: "", type: "TASK", dueDate: "", description: "" })
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to create activity")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!workflowForm.name) {
      toast.error("Workflow name is required")
      return
    }
    setLoading(true)
    try {
      const res = await createCrmWorkflow({
        name: workflowForm.name,
        description: workflowForm.description,
        triggerType: workflowForm.triggerType,
        conditions: [],
        actions: [{ actionType: "CREATE_TASK", config: { title: "Follow up" } }],
      })
      if (res.error) throw new Error(res.error)
      toast.success("Workflow draft created in Studio!")
      setActiveModal(null)
      setWorkflowForm({ name: "", description: "", triggerType: "LEAD_CREATED" })
      router.push("/crm/workflows")
    } catch (err: any) {
      toast.error(err.message || "Failed to create workflow")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDashboard = () => {
    toast.success("Custom dashboard view initialized! Configurable under Settings.")
    setActiveModal(null)
    router.push("/crm/dashboard")
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex items-center justify-center h-9 gap-1.5 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-500/20 font-medium text-xs sm:text-sm cursor-pointer transition-all">
          <Plus className="h-4 w-4 shrink-0" />
          <span>New</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-2xl glass shadow-2xl border-white/10">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
              CRM Quick Actions
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />

            <DropdownMenuItem
              onClick={() => setActiveModal("lead")}
              className="flex items-center gap-2.5 p-2 rounded-xl cursor-pointer hover:bg-white/10 text-xs font-medium"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                <Target className="h-3.5 w-3.5" />
              </div>
              New Lead
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => setActiveModal("contact")}
              className="flex items-center gap-2.5 p-2 rounded-xl cursor-pointer hover:bg-white/10 text-xs font-medium"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                <UserPlus className="h-3.5 w-3.5" />
              </div>
              New Contact / Company
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => setActiveModal("deal")}
              className="flex items-center gap-2.5 p-2 rounded-xl cursor-pointer hover:bg-white/10 text-xs font-medium"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                <Briefcase className="h-3.5 w-3.5" />
              </div>
              New Deal
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => setActiveModal("task")}
              className="flex items-center gap-2.5 p-2 rounded-xl cursor-pointer hover:bg-white/10 text-xs font-medium"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
                <CalendarCheck className="h-3.5 w-3.5" />
              </div>
              New Task / Meeting
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-white/10" />

            <DropdownMenuItem
              onClick={() => setActiveModal("workflow")}
              className="flex items-center gap-2.5 p-2 rounded-xl cursor-pointer hover:bg-white/10 text-xs font-medium"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
                <Workflow className="h-3.5 w-3.5" />
              </div>
              New Workflow
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => setActiveModal("dashboard")}
              className="flex items-center gap-2.5 p-2 rounded-xl cursor-pointer hover:bg-white/10 text-xs font-medium"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400">
                <LayoutDashboard className="h-3.5 w-3.5" />
              </div>
              New Dashboard
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ── New Lead Modal ── */}
      <Dialog open={activeModal === "lead"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-md glass border-white/10 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Target className="h-4 w-4 text-emerald-500" />
              Capture New Lead
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add a new prospect to your sales funnel. Workflows can auto-assign this lead.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateLead} className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Lead / Contact Name *</Label>
              <Input
                placeholder="e.g. Ramesh Kumar"
                value={leadForm.name}
                onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Company Name</Label>
                <Input
                  placeholder="Acme Tech Pvt Ltd"
                  value={leadForm.companyName}
                  onChange={(e) => setLeadForm({ ...leadForm, companyName: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Region / City</Label>
                <Input
                  placeholder="e.g. Bengaluru"
                  value={leadForm.region}
                  onChange={(e) => setLeadForm({ ...leadForm, region: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  placeholder="lead@company.com"
                  value={leadForm.email}
                  onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input
                  placeholder="+91 98765 43210"
                  value={leadForm.phone}
                  onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Estimated Deal Value (₹)</Label>
              <Input
                type="number"
                placeholder="75000"
                value={leadForm.estimatedValue}
                onChange={(e) => setLeadForm({ ...leadForm, estimatedValue: e.target.value })}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setActiveModal(null)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                {loading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                Save Lead
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── New Contact Modal ── */}
      <Dialog open={activeModal === "contact"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-md glass border-white/10 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <UserPlus className="h-4 w-4 text-blue-500" />
              New Contact / Company
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add a customer profile. Synced across both Sales CRM and Invoicing Suite.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateContact} className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Contact Person Name *</Label>
              <Input
                placeholder="e.g. Priya Sharma"
                value={contactForm.name}
                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Organization / Company Name</Label>
              <Input
                placeholder="Priya Consultancy Services"
                value={contactForm.companyName}
                onChange={(e) => setContactForm({ ...contactForm, companyName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  placeholder="contact@priya.in"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">State / Region</Label>
                <Input
                  placeholder="Karnataka"
                  value={contactForm.state}
                  onChange={(e) => setContactForm({ ...contactForm, state: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setActiveModal(null)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                {loading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                Save Contact
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── New Deal Modal ── */}
      <Dialog open={activeModal === "deal"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-md glass border-white/10 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Briefcase className="h-4 w-4 text-amber-500" />
              Create Pipeline Deal
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add a commercial opportunity to your sales pipeline.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateDeal} className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Deal Title *</Label>
              <Input
                placeholder="e.g. Annual Cloud Infrastructure Contract"
                value={dealForm.title}
                onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Deal Value (₹) *</Label>
              <Input
                type="number"
                placeholder="150000"
                value={dealForm.value}
                onChange={(e) => setDealForm({ ...dealForm, value: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes / Expected Scope</Label>
              <Textarea
                placeholder="Key requirements and scope..."
                value={dealForm.notes}
                onChange={(e) => setDealForm({ ...dealForm, notes: e.target.value })}
                rows={2}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setActiveModal(null)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white text-xs">
                {loading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                Create Deal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── New Task / Meeting Modal ── */}
      <Dialog open={activeModal === "task"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-md glass border-white/10 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <CalendarCheck className="h-4 w-4 text-purple-500" />
              Schedule Task or Meeting
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Schedule follow-up actions, customer calls, or client meetings.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Activity Type</Label>
              <div className="flex gap-2">
                {(["TASK", "CALL", "MEETING", "EMAIL"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTaskForm({ ...taskForm, type: t })}
                    className={`flex-1 py-1.5 px-2 text-xs rounded-lg font-medium border transition-all ${
                      taskForm.type === t
                        ? "bg-purple-500/20 border-purple-500/40 text-purple-400"
                        : "border-white/10 hover:bg-white/5 text-muted-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Title *</Label>
              <Input
                placeholder="Product demo presentation"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Due Date & Time</Label>
              <Input
                type="datetime-local"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setActiveModal(null)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white text-xs">
                {loading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                Schedule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── New Workflow Modal ── */}
      <Dialog open={activeModal === "workflow"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-md glass border-white/10 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Workflow className="h-4 w-4 text-indigo-500" />
              New Automation Workflow
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define visual Trigger ➔ Condition ➔ Action rules.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateWorkflow} className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Workflow Name *</Label>
              <Input
                placeholder="e.g. Inbound Lead Auto-Responder"
                value={workflowForm.name}
                onChange={(e) => setWorkflowForm({ ...workflowForm, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Trigger Event</Label>
              <select
                className="w-full text-xs bg-background/50 border border-white/10 rounded-lg p-2 text-foreground"
                value={workflowForm.triggerType}
                onChange={(e) => setWorkflowForm({ ...workflowForm, triggerType: e.target.value })}
              >
                <option value="LEAD_CREATED">When a new Lead is created</option>
                <option value="LEAD_STATUS_CHANGED">When Lead status updates</option>
                <option value="DEAL_CREATED">When a new Deal is logged</option>
                <option value="DEAL_STAGE_CHANGED">When Deal progresses in stage</option>
                <option value="DEAL_WON">When Deal is marked Won</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Input
                placeholder="Briefly describe what this automation accomplishes..."
                value={workflowForm.description}
                onChange={(e) => setWorkflowForm({ ...workflowForm, description: e.target.value })}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setActiveModal(null)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                {loading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                Open Studio
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── New Dashboard Modal ── */}
      <Dialog open={activeModal === "dashboard"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-md glass border-white/10 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <LayoutDashboard className="h-4 w-4 text-teal-500" />
              Configure Custom Sales Dashboard
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Customize widgets, revenue targets, and KPI charts for your executive sales overview.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2 text-xs text-muted-foreground">
            <p>Your workspace is equipped with live pipeline metrics, conversion rates, and stage drop-off widgets.</p>
            <p className="text-foreground font-medium">Click below to open and configure your customized dashboard layout.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setActiveModal(null)} className="text-xs">
              Close
            </Button>
            <Button onClick={handleCreateDashboard} className="bg-teal-600 hover:bg-teal-700 text-white text-xs">
              Launch Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
