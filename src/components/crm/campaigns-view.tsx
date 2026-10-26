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
  Eye,
  Rocket,
  FileText,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import { createCrmCampaign, launchCrmCampaign, deleteCrmCampaign } from "@/actions/crm"
import Link from "next/link"

interface AudienceCounts {
  QUALIFIED_LEADS: number
  ALL_LEADS: number
  EXISTING_CUSTOMERS: number
}

interface CampaignsViewProps {
  initialCampaigns: any[]
  audienceCounts?: AudienceCounts
}

const STARTER_TEMPLATES = [
  {
    name: "Exclusive B2B Proposal",
    subject: "Exclusive business growth proposal for {{name}}",
    targetAudience: "QUALIFIED_LEADS",
    content:
      "Hi {{name}},\n\nWe noticed your requirements and have prepared an exclusive proposal tailored for your operations. Would you be open for a brief 10-minute discovery call this Thursday?\n\nWarm regards,\nSales Team",
  },
  {
    name: "Prospect Follow-up & Demo",
    subject: "Following up on your requirements, {{name}}",
    targetAudience: "ALL_LEADS",
    content:
      "Hi {{name}},\n\nJust checking in following our earlier interaction. We've introduced several new capabilities that address your workflow challenges. Let us know if you'd like a personalized walkthrough!\n\nBest regards,\nAccount Team",
  },
  {
    name: "Customer Appreciation & Upsell",
    subject: "Valued client update for {{name}}",
    targetAudience: "EXISTING_CUSTOMERS",
    content:
      "Dear {{name}},\n\nThank you for choosing us as your partner. As an existing client, you now have access to exclusive enterprise upgrades with preferred pricing.\n\nWarmly,\nCustomer Success",
  },
]

export function CampaignsView({
  initialCampaigns,
  audienceCounts = { QUALIFIED_LEADS: 0, ALL_LEADS: 0, EXISTING_CUSTOMERS: 0 },
}: CampaignsViewProps) {
  const router = useRouter()
  const [openModal, setOpenModal] = React.useState(false)
  const [isLaunchImmediate, setIsLaunchImmediate] = React.useState(true)
  const [loading, setLoading] = React.useState(false)
  const [launchingId, setLaunchingId] = React.useState<string | null>(null)
  const [previewCampaign, setPreviewCampaign] = React.useState<any | null>(null)

  const [form, setForm] = React.useState({
    name: "",
    type: "EMAIL",
    subject: "",
    targetAudience: "QUALIFIED_LEADS",
    content: "",
    scheduledAt: "",
  })

  // Detect URL search params on mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      if (params.get("action") === "launch" || params.get("action") === "new") {
        setIsLaunchImmediate(true)
        setOpenModal(true)
      }
    }
  }, [])

  const handleOpenModal = (launchNow: boolean) => {
    setIsLaunchImmediate(launchNow)
    setOpenModal(true)
  }

  const handleApplyTemplate = (tmpl: typeof STARTER_TEMPLATES[0]) => {
    setForm({
      name: tmpl.name,
      type: "EMAIL",
      subject: tmpl.subject,
      targetAudience: tmpl.targetAudience,
      content: tmpl.content,
      scheduledAt: "",
    })
    setIsLaunchImmediate(true)
    setOpenModal(true)
  }

  const handleSaveOrLaunch = async (launchImmediately: boolean) => {
    if (!form.name || !form.subject) {
      toast.error("Campaign Title and Email Subject are required")
      return
    }

    setLoading(true)
    try {
      const res = await createCrmCampaign(form)
      if (res.error) throw new Error(res.error)

      if (launchImmediately && res.campaign?.id) {
        toast.info("Campaign created! Dispatching broadcast to audience...")
        const launchRes = await launchCrmCampaign(res.campaign.id)
        if (launchRes.error) {
          toast.warning(`Campaign saved, but broadcast had an issue: ${launchRes.error}`)
        } else {
          toast.success(`🚀 Broadcast dispatched successfully to ${launchRes.sentCount} recipients!`)
        }
      } else {
        toast.success("Campaign sequence saved as draft!")
      }

      setOpenModal(false)
      setForm({ name: "", type: "EMAIL", subject: "", targetAudience: "QUALIFIED_LEADS", content: "", scheduledAt: "" })
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to process campaign")
    } finally {
      setLoading(false)
    }
  }

  const handleLaunch = async (campaignId: string) => {
    setLaunchingId(campaignId)
    try {
      const res = await launchCrmCampaign(campaignId)
      if (res.error) throw new Error(res.error)
      toast.success(`🚀 Broadcast dispatched to ${res.sentCount} recipients!`)
      if (previewCampaign?.id === campaignId) {
        setPreviewCampaign({
          ...previewCampaign,
          status: "ACTIVE",
          sentCount: (previewCampaign.sentCount || 0) + res.sentCount,
        })
      }
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to launch campaign broadcast")
    } finally {
      setLaunchingId(null)
    }
  }

  const handleDelete = async (campaignId: string) => {
    try {
      const res = await deleteCrmCampaign(campaignId)
      if (res.error) throw new Error(res.error)
      toast.success("Campaign removed")
      if (previewCampaign?.id === campaignId) {
        setPreviewCampaign(null)
      }
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete campaign")
    }
  }

  const currentAudienceCount =
    form.targetAudience === "QUALIFIED_LEADS"
      ? audienceCounts.QUALIFIED_LEADS
      : form.targetAudience === "EXISTING_CUSTOMERS"
      ? audienceCounts.EXISTING_CUSTOMERS
      : audienceCounts.ALL_LEADS

  const totalDispatched = initialCampaigns.reduce((sum, c) => sum + (c.sentCount || 0), 0)

  return (
    <div className="space-y-6">
      {/* ── Overview Explainer & Top Action Banner ── */}
      <div className="p-5 rounded-2xl glass border border-white/10 bg-gradient-to-br from-emerald-500/10 via-background to-teal-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Lead Nurturing & Email Marketing
          </span>
          <h2 className="text-xl font-bold text-foreground mt-1">Outbound Broadcasts & Lead Nurturing</h2>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
            Dispatch personalized email blasts to qualified prospects, re-engage cold leads, and nurture high-intent contacts into closed deals with dynamic token replacement.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/crm/workflows">
            <Button variant="outline" size="sm" className="h-9 gap-1.5 glass border-white/10 text-xs">
              <Workflow className="h-3.5 w-3.5 text-indigo-400" />
              <span>Event Workflows</span>
            </Button>
          </Link>
          <Button
            onClick={() => handleOpenModal(false)}
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 glass border-white/10 text-xs text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Draft</span>
          </Button>
          <Button
            onClick={() => handleOpenModal(true)}
            size="sm"
            className="h-9 gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Launch & Send Broadcast</span>
          </Button>
        </div>
      </div>

      {/* ── Audience Reach Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl glass border border-white/10 bg-white/5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">Total Dispatched</span>
            <Send className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-xl font-bold text-foreground mt-1">{totalDispatched}</p>
          <span className="text-[10px] text-muted-foreground">Outreach emails sent</span>
        </div>

        <div className="p-3.5 rounded-xl glass border border-white/10 bg-white/5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">Qualified Leads</span>
            <Users className="h-4 w-4 text-teal-400" />
          </div>
          <p className="text-xl font-bold text-teal-400 mt-1">{audienceCounts.QUALIFIED_LEADS}</p>
          <span className="text-[10px] text-muted-foreground">High-intent contacts</span>
        </div>

        <div className="p-3.5 rounded-xl glass border border-white/10 bg-white/5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">All Leads</span>
            <Users className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-xl font-bold text-blue-400 mt-1">{audienceCounts.ALL_LEADS}</p>
          <span className="text-[10px] text-muted-foreground">Active sales pipeline</span>
        </div>

        <div className="p-3.5 rounded-xl glass border border-white/10 bg-white/5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">Existing Customers</span>
            <Users className="h-4 w-4 text-purple-400" />
          </div>
          <p className="text-xl font-bold text-purple-400 mt-1">{audienceCounts.EXISTING_CUSTOMERS}</p>
          <span className="text-[10px] text-muted-foreground">Upsell & recurring clients</span>
        </div>
      </div>

      {/* ── Empty State: Show 1-Click Starter Broadcasts ── */}
      {initialCampaigns.length === 0 ? (
        <div className="space-y-4">
          <Card className="glass border-white/10 p-8 sm:p-10 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="max-w-md mx-auto">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <Send className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Launch Your First Email Broadcast</h3>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Reach your prospects directly. Choose an audience segment, personalize with{" "}
                <code>&#123;&#123;name&#125;&#125;</code>, and dispatch right away.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
                <Button
                  onClick={() => handleOpenModal(true)}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold gap-2 px-4 shadow-lg shadow-emerald-500/20"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Launch & Send Broadcast</span>
                </Button>
                <Button
                  onClick={() => handleOpenModal(false)}
                  variant="outline"
                  className="glass border-white/10 text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  <span>Save Draft Campaign</span>
                </Button>
              </div>
            </div>
          </Card>

          {/* 1-Click Starter Templates */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2">
              Or Launch from a Ready-to-Use Template:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {STARTER_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.name}
                  onClick={() => handleApplyTemplate(tmpl)}
                  className="p-4 rounded-xl glass border border-white/10 hover:border-emerald-500/40 bg-white/5 hover:bg-emerald-500/5 cursor-pointer transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground group-hover:text-emerald-400 transition-colors">
                        {tmpl.name}
                      </span>
                      <Badge variant="outline" className="text-[9px] bg-white/5 border-white/10">
                        {tmpl.targetAudience.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1 italic">
                      Subject: {tmpl.subject}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                      {tmpl.content}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 mt-3 pt-2 border-t border-white/5">
                    <Send className="h-3 w-3" />
                    <span>Use & Launch Broadcast</span>
                    <ArrowRight className="h-3 w-3 ml-auto group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ── Campaigns Grid ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {initialCampaigns.map((camp) => {
            const hasDispatched = Boolean(camp.sentCount && camp.sentCount > 0)
            const targetCount =
              camp.targetAudience === "QUALIFIED_LEADS"
                ? audienceCounts.QUALIFIED_LEADS
                : camp.targetAudience === "EXISTING_CUSTOMERS"
                ? audienceCounts.EXISTING_CUSTOMERS
                : audienceCounts.ALL_LEADS

            return (
              <Card
                key={camp.id}
                className="glass border-white/10 shadow-sm hover:border-white/20 transition-all flex flex-col justify-between"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-bold text-foreground line-clamp-1">
                        {camp.name}
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        Subject: {camp.subject}
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-1">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          camp.status === "ACTIVE" || camp.status === "COMPLETED"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : camp.status === "SCHEDULED"
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Audience: <strong>{camp.targetAudience.replace(/_/g, " ")}</strong></span>
                      </div>
                      <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        {targetCount} leads
                      </span>
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

                  {/* Actions: Launch & Send Broadcast & Preview */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewCampaign(camp)}
                      className="h-8 text-xs glass border-white/10 hover:bg-white/10"
                      title="Preview campaign"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      onClick={() => handleLaunch(camp.id)}
                      disabled={launchingId === camp.id}
                      size="sm"
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs gap-1.5 h-8 font-bold shadow-md shadow-emerald-500/20"
                    >
                      {launchingId === camp.id ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Dispatching Outreach...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          <span>Launch & Send Broadcast</span>
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

      {/* ── Create / Launch Campaign Modal ── */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="sm:max-w-lg glass border-white/10 rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Send className="h-4 w-4" />
              </div>
              {isLaunchImmediate ? "Launch & Send Broadcast" : "Create Campaign Draft"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure targeted messaging and dispatch directly to leads or customers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
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
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Email Subject Line *</Label>
                <span className="text-[10px] text-emerald-400 font-mono">
                  Token: &#123;&#123;name&#125;&#125;
                </span>
              </div>
              <Input
                placeholder="e.g. Exclusive business proposal for {{name}}"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                required
                className="text-xs glass border-white/10"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Target Audience Segment</Label>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  {currentAudienceCount} recipients ready
                </span>
              </div>
              <select
                className="w-full text-xs bg-background/50 border border-white/10 rounded-lg p-2 text-foreground"
                value={form.targetAudience}
                onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
              >
                <option value="QUALIFIED_LEADS">
                  Qualified Leads ({audienceCounts.QUALIFIED_LEADS} available)
                </option>
                <option value="ALL_LEADS">
                  All Unconverted Leads ({audienceCounts.ALL_LEADS} available)
                </option>
                <option value="EXISTING_CUSTOMERS">
                  Existing Invoiced Customers ({audienceCounts.EXISTING_CUSTOMERS} available)
                </option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Email Body Template</Label>
              <Textarea
                placeholder="Hi {{name}}, we're reaching out regarding your business requirements..."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={4}
                className="text-xs glass border-white/10 resize-none font-sans"
              />
            </div>

            {/* Live Token Preview */}
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-[11px] text-muted-foreground space-y-1">
              <span className="font-semibold text-foreground block">
                Live Preview (Sample Lead: Ramesh Kumar):
              </span>
              <p className="italic text-foreground/80">
                Subject: {form.subject ? form.subject.replace(/\{\{name\}\}/gi, "Ramesh Kumar") : "—"}
              </p>
            </div>

            <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpenModal(false)}
                className="text-xs order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => handleSaveOrLaunch(false)}
                className="text-xs glass border-white/10 order-3 sm:order-2"
              >
                Save as Draft
              </Button>
              <Button
                type="button"
                disabled={loading}
                onClick={() => handleSaveOrLaunch(true)}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold order-1 sm:order-3 shadow-md shadow-emerald-500/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    <span>Processing Broadcast...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 mr-1" />
                    <span>Launch & Send Broadcast</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Preview / Detail Modal ── */}
      {previewCampaign && (
        <Dialog open={Boolean(previewCampaign)} onOpenChange={(open) => !open && setPreviewCampaign(null)}>
          <DialogContent className="sm:max-w-lg glass border-white/10 rounded-2xl p-6">
            <DialogHeader>
              <div className="flex items-center justify-between gap-2">
                <DialogTitle className="text-base font-bold text-foreground">
                  {previewCampaign.name}
                </DialogTitle>
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400">
                  {previewCampaign.status}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Audience: <strong>{previewCampaign.targetAudience.replace(/_/g, " ")}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Simulated Email Client Preview */}
              <div className="rounded-xl border border-white/10 overflow-hidden bg-background/80">
                <div className="p-3 border-b border-white/10 bg-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Subject:</span>
                    <span className="font-semibold text-foreground">
                      {(previewCampaign.subject || "").replace(/\{\{name\}\}/gi, "Aarav Sharma")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>To:</span>
                    <span className="font-mono text-emerald-400">aarav.sharma@example.com</span>
                  </div>
                </div>
                <div className="p-4 text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {(previewCampaign.content || "No message body provided.")
                    .replace(/\{\{name\}\}/gi, "Aarav Sharma")}
                </div>
              </div>

              {/* Delivery Metrics */}
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-white/5 text-center text-xs border border-white/5">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Dispatched</span>
                  <span className="font-bold text-foreground text-sm">{previewCampaign.sentCount || 0}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Opened</span>
                  <span className="font-bold text-emerald-400 text-sm">{previewCampaign.openCount || 0}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Clicked</span>
                  <span className="font-bold text-blue-400 text-sm">{previewCampaign.clickCount || 0}</span>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="ghost"
                onClick={() => setPreviewCampaign(null)}
                className="text-xs"
              >
                Close
              </Button>
              <Button
                onClick={() => handleLaunch(previewCampaign.id)}
                disabled={launchingId === previewCampaign.id}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold gap-1.5 shadow-md shadow-emerald-500/20"
              >
                {launchingId === previewCampaign.id ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Dispatching Outreach...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Launch & Send Broadcast</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
