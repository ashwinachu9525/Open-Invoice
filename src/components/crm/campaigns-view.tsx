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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  Edit3,
  MoreVertical,
  AlertTriangle,
  RotateCw,
  Search,
  Check,
  XCircle,
  Filter,
  MousePointerClick,
  ExternalLink,
  ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"
import {
  createCrmCampaign,
  updateCrmCampaign,
  launchCrmCampaign,
  deleteCrmCampaign,
  resendCrmEmailLog,
} from "@/actions/crm"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface AudienceCounts {
  QUALIFIED_LEADS: number
  ALL_LEADS: number
  EXISTING_CUSTOMERS: number
}

interface CrmEmailLogItem {
  id: string
  toEmail: string
  recipientName?: string | null
  subject: string
  bodyPreview?: string | null
  buttonText?: string | null
  buttonUrl?: string | null
  status: string
  error?: string | null
  openCount?: number
  clickCount?: number
  openedAt?: string | Date | null
  clickedAt?: string | Date | null
  ipAddress?: string | null
  userAgent?: string | null
  openEvents?: Array<{ timestamp: string; ip: string; clientType?: string; userAgent?: string }> | any
  clickEvents?: Array<{ timestamp: string; ip: string; clientType?: string; target?: string }> | any
  sentAt: string | Date
  campaign?: { id: string; name: string } | null
}

interface CampaignsViewProps {
  initialCampaigns: any[]
  audienceCounts?: AudienceCounts
  initialLogs?: CrmEmailLogItem[]
}

const STARTER_TEMPLATES = [
  {
    name: "Exclusive B2B Proposal",
    subject: "Exclusive business growth proposal for {{name}}",
    targetAudience: "QUALIFIED_LEADS",
    buttonText: "View Proposal",
    buttonUrl: "",
    content:
      "Hi {{name}},\n\nWe noticed your requirements and have prepared an exclusive proposal tailored for your operations. Would you be open for a brief 10-minute discovery call this Thursday?\n\nWarm regards,\nSales Team",
  },
  {
    name: "Prospect Follow-up & Demo",
    subject: "Following up on your requirements, {{name}}",
    targetAudience: "ALL_LEADS",
    buttonText: "Schedule Walkthrough",
    buttonUrl: "",
    content:
      "Hi {{name}},\n\nJust checking in following our earlier interaction. We've introduced several new capabilities that address your workflow challenges. Let us know if you'd like a personalized walkthrough!\n\nBest regards,\nAccount Team",
  },
  {
    name: "Customer Appreciation & Upsell",
    subject: "Valued client update for {{name}}",
    targetAudience: "EXISTING_CUSTOMERS",
    buttonText: "Explore Upgrades",
    buttonUrl: "",
    content:
      "Dear {{name}},\n\nThank you for choosing us as your partner. As an existing client, you now have access to exclusive enterprise upgrades with preferred pricing.\n\nWarmly,\nCustomer Success",
  },
]

export function CampaignsView({
  initialCampaigns,
  audienceCounts = { QUALIFIED_LEADS: 0, ALL_LEADS: 0, EXISTING_CUSTOMERS: 0 },
  initialLogs = [],
}: CampaignsViewProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = React.useState<"campaigns" | "logs">("campaigns")
  const [openModal, setOpenModal] = React.useState(false)
  const [isEditingId, setIsEditingId] = React.useState<string | null>(null)
  const [isLaunchImmediate, setIsLaunchImmediate] = React.useState(true)
  const [loading, setLoading] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [launchingId, setLaunchingId] = React.useState<string | null>(null)
  const [previewCampaign, setPreviewCampaign] = React.useState<any | null>(null)
  const [campaignToDelete, setCampaignToDelete] = React.useState<any | null>(null)

  // Mail Log states
  const [logSearch, setLogSearch] = React.useState("")
  const [logStatusFilter, setLogStatusFilter] = React.useState("ALL")
  const [selectedLog, setSelectedLog] = React.useState<CrmEmailLogItem | null>(null)
  const [resendingLogId, setResendingLogId] = React.useState<string | null>(null)

  const [form, setForm] = React.useState({
    name: "",
    type: "EMAIL",
    subject: "",
    targetAudience: "QUALIFIED_LEADS",
    content: "",
    buttonText: "",
    buttonUrl: "",
    scheduledAt: "",
  })

  // Detect URL search params on mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      if (params.get("action") === "launch" || params.get("action") === "new") {
        handleOpenCreate(true)
      } else if (params.get("tab") === "logs") {
        setActiveTab("logs")
      }
    }
  }, [])

  const handleOpenCreate = (launchNow: boolean) => {
    setIsEditingId(null)
    setForm({
      name: "",
      type: "EMAIL",
      subject: "",
      targetAudience: "QUALIFIED_LEADS",
      content: "",
      buttonText: "",
      buttonUrl: typeof window !== "undefined" ? window.location.origin : "",
      scheduledAt: "",
    })
    setIsLaunchImmediate(launchNow)
    setOpenModal(true)
  }

  const handleStartEdit = (camp: any) => {
    setIsEditingId(camp.id)
    setForm({
      name: camp.name || "",
      type: camp.type || "EMAIL",
      subject: camp.subject || "",
      targetAudience: camp.targetAudience || "QUALIFIED_LEADS",
      content: camp.content || "",
      buttonText: camp.buttonText || "",
      buttonUrl: camp.buttonUrl || "",
      scheduledAt: camp.scheduledAt ? new Date(camp.scheduledAt).toISOString().slice(0, 16) : "",
    })
    setIsLaunchImmediate(false)
    setPreviewCampaign(null)
    setOpenModal(true)
  }

  const handleApplyTemplate = (tmpl: typeof STARTER_TEMPLATES[0]) => {
    setIsEditingId(null)
    setForm({
      name: tmpl.name,
      type: "EMAIL",
      subject: tmpl.subject,
      targetAudience: tmpl.targetAudience,
      content: tmpl.content,
      buttonText: tmpl.buttonText || "",
      buttonUrl: typeof window !== "undefined" ? window.location.origin : "",
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
      if (isEditingId) {
        // Update existing campaign
        const res = await updateCrmCampaign(isEditingId, form)
        if (res.error) throw new Error(res.error)

        if (launchImmediately) {
          toast.info("Changes saved! Dispatching live emails via SMTP...")
          const launchRes = await launchCrmCampaign(isEditingId)
          if (launchRes.error) {
            toast.error(launchRes.error, {
              duration: 6000,
              description: "Check your SMTP sender settings under Settings > Email Settings.",
            })
          } else {
            toast.success(`🚀 Broadcast sent to ${launchRes.sentCount} recipients via SMTP!`)
          }
        } else {
          toast.success("Campaign updated successfully!")
        }
      } else {
        // Create new campaign
        const res = await createCrmCampaign(form)
        if (res.error) throw new Error(res.error)

        if (launchImmediately && res.campaign?.id) {
          toast.info("Campaign created! Dispatching live emails via SMTP...")
          const launchRes = await launchCrmCampaign(res.campaign.id)
          if (launchRes.error) {
            toast.error(launchRes.error, {
              duration: 6000,
              description: "Check your SMTP sender settings under Settings > Email Settings.",
            })
          } else {
            toast.success(`🚀 Broadcast sent to ${launchRes.sentCount} recipients via SMTP!`)
          }
        } else {
          toast.success("Campaign saved as draft!")
        }
      }

      setOpenModal(false)
      setIsEditingId(null)
      setForm({ name: "", type: "EMAIL", subject: "", targetAudience: "QUALIFIED_LEADS", content: "", buttonText: "", buttonUrl: "", scheduledAt: "" })
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
      if (res.error) {
        toast.error(res.error, {
          duration: 7000,
          description: "Ensure SMTP settings are configured under Settings > Email Settings.",
        })
        return
      }

      if (res.warning) {
        toast.warning(res.warning, { duration: 6000 })
      } else {
        toast.success(`🚀 Broadcast dispatched successfully to ${res.sentCount} recipients via SMTP!`)
      }

      if (previewCampaign?.id === campaignId) {
        setPreviewCampaign({
          ...previewCampaign,
          status: "ACTIVE",
          sentCount: (previewCampaign.sentCount || 0) + (res.sentCount || 0),
        })
      }
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to launch campaign broadcast")
    } finally {
      setLaunchingId(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!campaignToDelete) return
    setDeleting(true)
    try {
      const res = await deleteCrmCampaign(campaignToDelete.id)
      if (res.error) throw new Error(res.error)
      toast.success(`Campaign "${campaignToDelete.name}" deleted`)
      if (previewCampaign?.id === campaignToDelete.id) {
        setPreviewCampaign(null)
      }
      setCampaignToDelete(null)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete campaign")
    } finally {
      setDeleting(false)
    }
  }

  const handleResendLog = async (logId: string) => {
    setResendingLogId(logId)
    try {
      const res = await resendCrmEmailLog(logId)
      if (res.error) throw new Error(res.error)
      toast.success("Email re-dispatched via SMTP successfully!")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to resend email")
    } finally {
      setResendingLogId(null)
    }
  }

  const currentAudienceCount =
    form.targetAudience === "QUALIFIED_LEADS"
      ? audienceCounts.QUALIFIED_LEADS
      : form.targetAudience === "EXISTING_CUSTOMERS"
      ? audienceCounts.EXISTING_CUSTOMERS
      : audienceCounts.ALL_LEADS

  const totalDispatched = initialCampaigns.reduce((sum, c) => sum + (c.sentCount || 0), 0)

  // Filtered mail logs
  const filteredLogs = initialLogs.filter((log) => {
    const matchesSearch =
      !logSearch ||
      log.toEmail.toLowerCase().includes(logSearch.toLowerCase()) ||
      (log.recipientName && log.recipientName.toLowerCase().includes(logSearch.toLowerCase())) ||
      log.subject.toLowerCase().includes(logSearch.toLowerCase())

    const matchesStatus = logStatusFilter === "ALL" || log.status === logStatusFilter
    return matchesSearch && matchesStatus
  })

  const totalLogsSent = initialLogs.filter((l) => l.status === "SENT").length
  const totalLogsFailed = initialLogs.filter((l) => l.status === "FAILED").length
  const deliveryRate = initialLogs.length > 0 ? Math.round((totalLogsSent / initialLogs.length) * 100) : 100

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
            Dispatch personalized email blasts to qualified prospects, re-engage cold leads, and nurture high-intent contacts into closed deals with SMTP delivery and mail tracking.
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
            onClick={() => handleOpenCreate(false)}
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 glass border-white/10 text-xs text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Draft</span>
          </Button>
          <Button
            onClick={() => handleOpenCreate(true)}
            size="sm"
            className="h-9 gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Launch & Send Broadcast</span>
          </Button>
        </div>
      </div>

      {/* ── Main Tab Switcher: Campaigns vs Mail Delivery Logs ── */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("campaigns")}
          className={cn(
            "px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2",
            activeTab === "campaigns"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          )}
        >
          <Megaphone className="h-3.5 w-3.5" />
          <span>Campaigns & Sequences ({initialCampaigns.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("logs")}
          className={cn(
            "px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2",
            activeTab === "logs"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          )}
        >
          <Mail className="h-3.5 w-3.5" />
          <span>Mail Delivery Logs ({initialLogs.length})</span>
        </button>
      </div>

      {/* ═════════════════════════════════════════════════════════════
          TAB 1: CAMPAIGNS & SEQUENCES
          ═════════════════════════════════════════════════════════════ */}
      {activeTab === "campaigns" && (
        <div className="space-y-6">
          {/* Audience Reach Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl glass border border-white/10 bg-white/5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground font-medium">Total Dispatched</span>
                <Send className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-xl font-bold text-foreground mt-1">{totalDispatched}</p>
              <span className="text-[10px] text-muted-foreground">Emails sent via SMTP</span>
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

          {/* Empty State vs Campaigns Grid */}
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
                      onClick={() => handleOpenCreate(true)}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold gap-2 px-4 shadow-lg shadow-emerald-500/20"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Launch & Send Broadcast</span>
                    </Button>
                    <Button
                      onClick={() => handleOpenCreate(false)}
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
            /* Campaigns Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {initialCampaigns.map((camp) => {
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

                        <div className="flex items-center gap-1.5">
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

                          {/* Dropdown Menu for Edit / Delete / Preview */}
                          <DropdownMenu>
                            <DropdownMenuTrigger className="h-7 w-7 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors">
                              <MoreVertical className="h-3.5 w-3.5" />
                              <span className="sr-only">Campaign options</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 glass border-white/10 p-1 rounded-xl">
                              <DropdownMenuItem
                                onClick={() => handleStartEdit(camp)}
                                className="text-xs flex items-center gap-2 cursor-pointer hover:bg-white/10 rounded-lg p-2"
                              >
                                <Edit3 className="h-3.5 w-3.5 text-blue-400" />
                                <span>Edit Campaign</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setPreviewCampaign(camp)}
                                className="text-xs flex items-center gap-2 cursor-pointer hover:bg-white/10 rounded-lg p-2"
                              >
                                <Eye className="h-3.5 w-3.5 text-teal-400" />
                                <span>Preview Details</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleLaunch(camp.id)}
                                className="text-xs flex items-center gap-2 cursor-pointer hover:bg-white/10 rounded-lg p-2 text-emerald-400"
                              >
                                <Send className="h-3.5 w-3.5" />
                                <span>Launch Broadcast</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-white/10" />
                              <DropdownMenuItem
                                onClick={() => setCampaignToDelete(camp)}
                                className="text-xs flex items-center gap-2 cursor-pointer hover:bg-red-500/10 text-red-400 rounded-lg p-2"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Delete Campaign</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

                        {camp.buttonText && (
                          <div className="flex items-center gap-1.5 text-indigo-400 text-[11px]">
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">CTA Button: <strong>{camp.buttonText}</strong></span>
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

                      {/* Actions: Launch, Edit, Preview, Delete */}
                      <div className="space-y-2 pt-1">
                        <Button
                          onClick={() => handleLaunch(camp.id)}
                          disabled={launchingId === camp.id}
                          size="sm"
                          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs gap-1.5 h-8 font-bold shadow-md shadow-emerald-500/20"
                        >
                          {launchingId === camp.id ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>Sending Live Emails via SMTP...</span>
                            </>
                          ) : (
                            <>
                              <Send className="h-3.5 w-3.5" />
                              <span>Launch & Send Broadcast</span>
                            </>
                          )}
                        </Button>

                        <div className="grid grid-cols-3 gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStartEdit(camp)}
                            className="h-7 text-xs glass border-white/10 hover:bg-white/10 hover:text-blue-400 gap-1 px-2"
                            title="Edit campaign"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>Edit</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewCampaign(camp)}
                            className="h-7 text-xs glass border-white/10 hover:bg-white/10 hover:text-teal-400 gap-1 px-2"
                            title="Preview details"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Preview</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCampaignToDelete(camp)}
                            className="h-7 text-xs glass border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 gap-1 px-2 text-muted-foreground"
                            title="Delete campaign"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Delete</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════
          TAB 2: CRM MAIL DELIVERY LOGS (NEW)
          ═════════════════════════════════════════════════════════════ */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl glass border border-white/10 bg-white/5">
              <span className="text-[11px] text-muted-foreground font-medium">Total Emails Logged</span>
              <p className="text-xl font-bold text-foreground mt-1">{initialLogs.length}</p>
              <span className="text-[10px] text-muted-foreground">All outreach dispatches</span>
            </div>

            <div className="p-3.5 rounded-xl glass border border-white/10 bg-white/5">
              <span className="text-[11px] text-muted-foreground font-medium">Delivered (Sent)</span>
              <p className="text-xl font-bold text-emerald-400 mt-1">{totalLogsSent}</p>
              <span className="text-[10px] text-muted-foreground">Verified SMTP transmissions</span>
            </div>

            <div className="p-3.5 rounded-xl glass border border-white/10 bg-white/5">
              <span className="text-[11px] text-muted-foreground font-medium">Delivery Failures</span>
              <p className="text-xl font-bold text-red-400 mt-1">{totalLogsFailed}</p>
              <span className="text-[10px] text-muted-foreground">SMTP or address errors</span>
            </div>

            <div className="p-3.5 rounded-xl glass border border-white/10 bg-white/5">
              <span className="text-[11px] text-muted-foreground font-medium">Delivery Success Rate</span>
              <p className="text-xl font-bold text-teal-400 mt-1">{deliveryRate}%</p>
              <span className="text-[10px] text-muted-foreground">Effective transmission</span>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl glass border border-white/10">
            <div className="relative flex-1 max-w-sm">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search recipient email, name, subject..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="text-xs h-8 pl-8 glass border-white/10"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={logStatusFilter}
                onChange={(e) => setLogStatusFilter(e.target.value)}
                className="text-xs h-8 bg-background/50 border border-white/10 rounded-lg px-2 text-foreground"
              >
                <option value="ALL">All Delivery Statuses</option>
                <option value="SENT">Delivered / Sent</option>
                <option value="FAILED">Failed</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => router.refresh()}
                className="h-8 text-xs glass border-white/10 gap-1.5"
                title="Refresh logs"
              >
                <RotateCw className="h-3 w-3" />
                <span>Refresh</span>
              </Button>
            </div>
          </div>

          {/* Logs Table */}
          <div className="rounded-2xl glass border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-white/10 text-muted-foreground font-semibold bg-white/2">
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Recipient</th>
                    <th className="py-2.5 px-4">Subject Line</th>
                    <th className="py-2.5 px-4">Engagement (Opens / Clicks)</th>
                    <th className="py-2.5 px-4">Campaign</th>
                    <th className="py-2.5 px-4">Sent At</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-xs text-muted-foreground">
                        <Mail className="h-8 w-8 mx-auto mb-2 opacity-40 text-muted-foreground" />
                        No email delivery logs found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const isSent = log.status === "SENT"
                      return (
                        <tr key={log.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1",
                                isSent
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : "bg-red-500/10 text-red-400 border-red-500/20"
                              )}
                            >
                              {isSent ? <Check className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                              <span>{log.status}</span>
                            </Badge>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-foreground">
                              {log.recipientName || "Contact"}
                            </div>
                            <div className="text-[11px] font-mono text-muted-foreground">
                              {log.toEmail}
                            </div>
                          </td>

                          <td className="py-3 px-4 max-w-xs">
                            <div className="font-medium text-foreground truncate">{log.subject}</div>
                            {log.error && (
                              <div className="text-[10px] text-red-400 truncate mt-0.5" title={log.error}>
                                Error: {log.error}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1 text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <Eye className={cn("h-3 w-3", (log.openCount || 0) > 0 ? "text-emerald-400" : "text-muted-foreground")} />
                                <span className={cn((log.openCount || 0) > 0 ? "text-emerald-400 font-semibold" : "text-muted-foreground")}>
                                  {(log.openCount || 0) > 0 ? `${log.openCount} open${(log.openCount || 0) > 1 ? "s" : ""}` : "Unopened"}
                                </span>
                                {log.ipAddress && (
                                  <span className="text-[9px] font-mono text-slate-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded" title={`Tracked Client IP: ${log.ipAddress}`}>
                                    {log.ipAddress}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <MousePointerClick className={cn("h-3 w-3", (log.clickCount || 0) > 0 ? "text-blue-400" : "text-muted-foreground")} />
                                <span className={cn((log.clickCount || 0) > 0 ? "text-blue-400 font-semibold" : "text-muted-foreground")}>
                                  {(log.clickCount || 0) > 0 ? `${log.clickCount} click${(log.clickCount || 0) > 1 ? "s" : ""}` : "No clicks"}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {log.campaign ? (
                              <Badge variant="outline" className="text-[10px] bg-white/5 border-white/10 font-normal">
                                {log.campaign.name}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">Direct Outreach</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                            {new Date(log.sentAt).toLocaleString("en-IN", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>

                          <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedLog(log)}
                              className="h-7 text-[11px] glass border-white/10 hover:bg-white/10 gap-1 px-2"
                            >
                              <Eye className="h-3 w-3" />
                              <span>View</span>
                            </Button>

                            {!isSent && (
                              <Button
                                size="sm"
                                disabled={resendingLogId === log.id}
                                onClick={() => handleResendLog(log.id)}
                                className="h-7 text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white gap-1 px-2"
                              >
                                {resendingLogId === log.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <RotateCw className="h-3 w-3" />
                                )}
                                <span>Retry</span>
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── View Single Email Log Modal ── */}
      {selectedLog && (
        <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => !open && setSelectedLog(null)}>
          <DialogContent className="sm:max-w-lg glass border-white/10 rounded-2xl p-6">
            <DialogHeader>
              <div className="flex items-center justify-between gap-2">
                <DialogTitle className="text-base font-bold text-foreground">
                  Email Delivery Log Details
                </DialogTitle>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5",
                    selectedLog.status === "SENT"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-red-500/10 text-red-400 border-red-500/20"
                  )}
                >
                  {selectedLog.status}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Dispatched on {new Date(selectedLog.sentAt).toLocaleString("en-IN")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <div>
                  <span className="text-muted-foreground">To: </span>
                  <span className="font-semibold text-foreground">
                    {selectedLog.recipientName ? `${selectedLog.recipientName} ` : ""}
                    &lt;{selectedLog.toEmail}&gt;
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Subject: </span>
                  <span className="font-semibold text-foreground">{selectedLog.subject}</span>
                </div>
                {selectedLog.campaign && (
                  <div>
                    <span className="text-muted-foreground">Campaign: </span>
                    <span className="text-emerald-400 font-medium">{selectedLog.campaign.name}</span>
                  </div>
                )}
              </div>

              {/* Engagement Metrics (Opens & Clicks) */}
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-white/5 border border-white/10 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block flex items-center gap-1">
                    <Eye className="h-3 w-3 text-emerald-400" />
                    Email Opens
                  </span>
                  <span className={cn("font-bold text-sm", (selectedLog.openCount || 0) > 0 ? "text-emerald-400" : "text-muted-foreground")}>
                    {(selectedLog.openCount || 0) > 0 ? `${selectedLog.openCount} open${(selectedLog.openCount || 0) > 1 ? "s" : ""}` : "Unopened"}
                  </span>
                  {selectedLog.openedAt && (
                    <span className="text-[10px] text-muted-foreground block mt-0.5 font-mono">
                      First: {new Date(selectedLog.openedAt).toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block flex items-center gap-1">
                    <MousePointerClick className="h-3 w-3 text-blue-400" />
                    Link / CTA Clicks
                  </span>
                  <span className={cn("font-bold text-sm", (selectedLog.clickCount || 0) > 0 ? "text-blue-400" : "text-muted-foreground")}>
                    {(selectedLog.clickCount || 0) > 0 ? `${selectedLog.clickCount} click${(selectedLog.clickCount || 0) > 1 ? "s" : ""}` : "No clicks"}
                  </span>
                  {selectedLog.clickedAt && (
                    <span className="text-[10px] text-muted-foreground block mt-0.5 font-mono">
                      First: {new Date(selectedLog.clickedAt).toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
              </div>

              {/* Verified Client IP & Device */}
              {selectedLog.ipAddress && (
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                      Client IP Address:
                    </span>
                    <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-[11px]">
                      {selectedLog.ipAddress}
                    </span>
                  </div>
                  {selectedLog.userAgent && (
                    <div className="text-[11px] text-muted-foreground truncate" title={selectedLog.userAgent}>
                      Client Device: <span className="text-slate-300 font-mono text-[10px]">{selectedLog.userAgent}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Open Events Audit Log */}
              {Array.isArray(selectedLog.openEvents) && selectedLog.openEvents.length > 0 && (
                <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5 text-emerald-400" />
                      Verified Physical Open Sessions ({selectedLog.openEvents.length})
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      IP-Debounced
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {selectedLog.openEvents.map((evt: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded bg-white/5 text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 font-mono font-semibold">{evt.ip || "Unknown IP"}</span>
                          <span className="text-muted-foreground text-[10px]">({evt.clientType || "Client"})</span>
                        </div>
                        <span className="text-muted-foreground font-mono text-[10px]">
                          {new Date(evt.timestamp).toLocaleString("en-IN", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedLog.buttonText && (
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs space-y-1">
                  <span className="font-semibold text-indigo-300 block flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Configured CTA Button:
                  </span>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-bold text-foreground">{selectedLog.buttonText}</span>
                    <span className="text-[11px] font-mono text-indigo-400 truncate max-w-xs">{selectedLog.buttonUrl || "Application URL"}</span>
                  </div>
                </div>
              )}

              {selectedLog.error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs space-y-1">
                  <span className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Delivery Error:
                  </span>
                  <p className="font-mono text-[11px] leading-relaxed">{selectedLog.error}</p>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground uppercase font-semibold">
                  Dispatched Email Body:
                </Label>
                <div className="p-3 rounded-xl border border-white/10 bg-black/40 text-foreground/90 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto font-sans text-xs">
                  {selectedLog.bodyPreview || selectedLog.subject}
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-row justify-between">
              <Button variant="ghost" onClick={() => setSelectedLog(null)} className="text-xs">
                Close
              </Button>
              {selectedLog.status !== "SENT" && (
                <Button
                  onClick={() => {
                    const id = selectedLog.id
                    setSelectedLog(null)
                    handleResendLog(id)
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5 font-semibold"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  <span>Retry Dispatch</span>
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Create / Edit Campaign Modal ── */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="sm:max-w-lg glass border-white/10 rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                {isEditingId ? <Edit3 className="h-4 w-4 text-blue-400" /> : <Send className="h-4 w-4" />}
              </div>
              {isEditingId
                ? "Edit Campaign Details"
                : isLaunchImmediate
                ? "Launch & Send Broadcast"
                : "Create Campaign Draft"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {isEditingId
                ? "Update campaign message, audience targeting, or schedule settings."
                : "Configure targeted messaging and dispatch live emails directly via SMTP."}
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

            {/* Dynamic CTA Button & Link */}
            <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/15 space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                  Dynamic CTA Button & Link Tracking
                </Label>
                <span className="text-[10px] text-muted-foreground">Optional</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300 font-medium">Button Label</Label>
                  <Input
                    placeholder="e.g. View Proposal / Book Demo"
                    value={form.buttonText}
                    onChange={(e) => setForm({ ...form, buttonText: e.target.value })}
                    className="text-xs glass border-white/10"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] text-slate-300 font-medium">Dynamic Link</Label>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, buttonUrl: typeof window !== "undefined" ? window.location.origin : "" })}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline"
                    >
                      Use App URL
                    </button>
                  </div>
                  <Input
                    placeholder="Defaults to Application Link"
                    value={form.buttonUrl}
                    onChange={(e) => setForm({ ...form, buttonUrl: e.target.value })}
                    className="text-xs glass border-white/10"
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Both email opens and button clicks are automatically tracked in your CRM Campaign analytics.
              </p>
            </div>

            {/* Live Token Preview */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-[11px] text-muted-foreground space-y-2">
              <span className="font-semibold text-foreground block">
                Live Preview (Sample Lead: Ramesh Kumar):
              </span>
              <p className="italic text-foreground/80">
                Subject: {form.subject ? form.subject.replace(/\{\{name\}\}/gi, "Ramesh Kumar") : "—"}
              </p>
              {form.buttonText && (
                <div className="pt-1 text-center">
                  <div className="inline-block px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold text-xs shadow-sm">
                    {form.buttonText} ➔ {form.buttonUrl || "Application URL"}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpenModal(false)}
                className="text-xs order-3 sm:order-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => handleSaveOrLaunch(false)}
                className="text-xs glass border-white/10 order-2 sm:order-2"
              >
                {isEditingId ? "Save Changes" : "Save as Draft"}
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
                    <span>Dispatching via SMTP...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 mr-1" />
                    <span>{isEditingId ? "Save & Launch Broadcast" : "Launch & Send Broadcast"}</span>
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
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400">
                    {previewCampaign.status}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const toEdit = previewCampaign
                      setPreviewCampaign(null)
                      handleStartEdit(toEdit)
                    }}
                    className="h-7 px-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 gap-1"
                  >
                    <Edit3 className="h-3 w-3" />
                    <span>Edit</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const toDel = previewCampaign
                      setPreviewCampaign(null)
                      setCampaignToDelete(toDel)
                    }}
                    className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Delete</span>
                  </Button>
                </div>
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
                {previewCampaign.buttonText && (
                  <div className="pt-2 pb-4 text-center border-t border-white/5 bg-white/2">
                    <div className="inline-block px-5 py-2 rounded-lg bg-indigo-600 text-white font-semibold text-xs shadow-md">
                      {previewCampaign.buttonText}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1.5 font-mono">
                      Target Link: {previewCampaign.buttonUrl || "Application URL"}
                    </div>
                  </div>
                )}
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

            <DialogFooter className="flex flex-col sm:flex-row gap-2 justify-between">
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setPreviewCampaign(null)}
                  className="text-xs"
                >
                  Close
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const toEdit = previewCampaign
                    setPreviewCampaign(null)
                    handleStartEdit(toEdit)
                  }}
                  className="text-xs glass border-white/10 text-blue-400 hover:text-blue-300 gap-1.5"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit Campaign</span>
                </Button>
              </div>

              <Button
                onClick={() => handleLaunch(previewCampaign.id)}
                disabled={launchingId === previewCampaign.id}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold gap-1.5 shadow-md shadow-emerald-500/20"
              >
                {launchingId === previewCampaign.id ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Dispatching live emails via SMTP...</span>
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

      {/* ── Confirm Delete Modal ── */}
      <Dialog open={Boolean(campaignToDelete)} onOpenChange={(open) => !open && setCampaignToDelete(null)}>
        <DialogContent className="sm:max-w-md glass border-white/10 rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-red-400">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Delete Campaign
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to delete{" "}
              <strong className="text-foreground font-semibold">"{campaignToDelete?.name}"</strong>?
              This action cannot be undone and will remove all delivery stats for this campaign.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3 flex flex-row gap-2 justify-end">
            <Button
              variant="ghost"
              onClick={() => setCampaignToDelete(null)}
              disabled={deleting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold gap-1.5 shadow-md shadow-red-500/20"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Yes, Delete Campaign</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
