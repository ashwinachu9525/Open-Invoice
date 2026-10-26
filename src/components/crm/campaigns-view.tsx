"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Megaphone,
  Plus,
  Send,
  Mail,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Trash2,
  Play,
  Sparkles,
  Workflow,
  ArrowRight,
  TrendingUp,
} from "lucide-react"
import { toast } from "sonner"
import { createCrmCampaign, launchCrmCampaign, deleteCrmCampaign } from "@/actions/crm"
import Link from "next/link"

interface CampaignsViewProps {
  initialCampaigns: any[]
}

export function CampaignsView({ initialCampaigns }: CampaignsViewProps) {
  const router = useRouter()
  const [openModal, setOpenModal] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [launchingId, setLaunchingId] = React.useState<string | null>(null)
  const [form, setForm] = React.useState({
    name: "",
    type: "EMAIL",
    subject: "",
    targetAudience: "QUALIFIED_LEADS",
    content: "",
    scheduledAt: "",
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.subject) {
      toast.error("Name and Subject are required")
      return
    }
    setLoading(true)
    try {
      const res = await createCrmCampaign(form)
      if (res.error) throw new Error(res.error)
      toast.success("Campaign sequence configured!")
      setOpenModal(false)
      setForm({ name: "", type: "EMAIL", subject: "", targetAudience: "QUALIFIED_LEADS", content: "", scheduledAt: "" })
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to create campaign")
    } finally {
      setLoading(false)
    }
  }

  const handleLaunch = async (campaignId: string) => {
    setLaunchingId(campaignId)
    try {
      const res = await launchCrmCampaign(campaignId)
      if (res.error) throw new Error(res.error)
      toast.success(`Campaign broadcast dispatched to ${res.sentCount} recipients!`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to launch campaign")
    } finally {
      setLaunchingId(null)
    }
  }

  const handleDelete = async (campaignId: string) => {
    try {
      const res = await deleteCrmCampaign(campaignId)
      if (res.error) throw new Error(res.error)
      toast.success("Campaign removed")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete campaign")
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Overview Explainer Banner ── */}
      <div className="p-5 rounded-2xl glass border border-white/10 bg-gradient-to-br from-emerald-500/10 via-background to-teal-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            Lead Nurturing & Email Marketing
          </span>
          <h2 className="text-xl font-bold text-foreground mt-1">Outbound Broadcasts & Nurture Sequences</h2>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
            Automate personalized outreach to prospects, re-engage cold leads, and nurture high-intent contacts into closed deals with audience segmentation and delivery analytics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/crm/workflows">
            <Button variant="outline" size="sm" className="h-9 gap-1.5 glass border-white/10 text-xs">
              <Workflow className="h-3.5 w-3.5 text-indigo-400" />
              <span>Event Workflows</span>
            </Button>
          </Link>
          <Button
            onClick={() => setOpenModal(true)}
            className="h-9 gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-500/20"
          >
            <Plus className="h-4 w-4" />
            <span>New Campaign</span>
          </Button>
        </div>
      </div>

      {/* ── Campaigns Grid ── */}
      {initialCampaigns.length === 0 ? (
        <Card className="glass border-white/10 p-12 text-center">
          <Megaphone className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <h3 className="text-base font-semibold text-foreground">No campaigns created yet</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Create an outbound broadcast or nurture sequence for your qualified leads or existing customers.
          </p>
          <Button
            onClick={() => setOpenModal(true)}
            size="sm"
            className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Campaign
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {initialCampaigns.map((camp) => {
            const isCompleted = camp.status === "ACTIVE" || camp.status === "COMPLETED"
            return (
              <Card
                key={camp.id}
                className="glass border-white/10 shadow-sm hover:border-white/20 transition-all flex flex-col justify-between"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground line-clamp-1">
                        {camp.name}
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        Subject: {camp.subject}
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          camp.status === "ACTIVE" || camp.status === "COMPLETED"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : camp.status === "SCHEDULED"
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            : "bg-white/5 text-muted-foreground border-white/10"
                        }`}
                      >
                        {camp.status}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(camp.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-red-400"
                        title="Delete campaign"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-1">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Audience: <strong>{camp.targetAudience.replace(/_/g, " ")}</strong></span>
                    </div>
                    {camp.scheduledAt && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Scheduled: {new Date(camp.scheduledAt).toLocaleDateString("en-IN")}</span>
                      </div>
                    )}
                  </div>

                  {/* Delivery Metrics Bar */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-white/5 text-center text-xs pt-2 border border-white/5">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Dispatched</span>
                      <span className="font-bold text-foreground text-sm">{camp.sentCount || 0}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Opens</span>
                      <span className="font-bold text-emerald-400 text-sm">{camp.openCount || 0}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Clicks</span>
                      <span className="font-bold text-blue-400 text-sm">{camp.clickCount || 0}</span>
                    </div>
                  </div>

                  {/* Action Button: Launch / Send Now */}
                  <div className="pt-1">
                    <Button
                      onClick={() => handleLaunch(camp.id)}
                      disabled={launchingId === camp.id}
                      size="sm"
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5 h-8 font-semibold shadow-sm"
                    >
                      {launchingId === camp.id ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Dispatching Outreach...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          <span>{isCompleted ? "Re-send Broadcast" : "Launch & Send Broadcast"}</span>
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Create Campaign Dialog ── */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="sm:max-w-lg glass border-white/10 rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Megaphone className="h-4 w-4 text-emerald-400" />
              Create Email Campaign
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure an outreach broadcast or nurture sequence for your pipeline contacts.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Campaign Title *</Label>
              <Input
                placeholder="e.g. Q4 Festive Business Solutions Outreach"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="text-xs glass border-white/10"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Email Subject Line *</Label>
              <Input
                placeholder="e.g. Exclusive B2B proposal for {{name}}"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                required
                className="text-xs glass border-white/10"
              />
              <p className="text-[10px] text-muted-foreground">Use <code>&#123;&#123;name&#125;&#125;</code> to dynamically insert the recipient's name.</p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Target Audience Segment</Label>
              <select
                className="w-full text-xs bg-background/50 border border-white/10 rounded-lg p-2 text-foreground"
                value={form.targetAudience}
                onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
              >
                <option value="QUALIFIED_LEADS">Qualified Leads (High-intent prospects)</option>
                <option value="ALL_LEADS">All Unconverted Leads</option>
                <option value="EXISTING_CUSTOMERS">Existing Invoiced Customers (Upsell)</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Email Body Template</Label>
              <Textarea
                placeholder="Hi {{name}}, we're reaching out regarding your business requirements..."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={4}
                className="text-xs glass border-white/10 resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setOpenModal(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold">
                {loading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                Save Campaign
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
