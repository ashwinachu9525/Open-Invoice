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
} from "lucide-react"
import { toast } from "sonner"
import { createCrmCampaign } from "@/actions/crm"

interface CampaignsViewProps {
  initialCampaigns: any[]
}

export function CampaignsView({ initialCampaigns }: CampaignsViewProps) {
  const router = useRouter()
  const [openModal, setOpenModal] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Nurture incoming leads and engage existing customer accounts with automated email sequences.
        </p>
        <Button
          onClick={() => setOpenModal(true)}
          className="h-9 gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold"
        >
          <Plus className="h-4 w-4" />
          <span>New Campaign</span>
        </Button>
      </div>

      {initialCampaigns.length === 0 ? (
        <Card className="glass border-white/10 p-12 text-center">
          <Megaphone className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <h3 className="text-base font-semibold text-foreground">No campaigns created yet</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Design targeted outbound emails and nurture sequences for your sales pipeline.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {initialCampaigns.map((camp) => (
            <Card key={camp.id} className="glass border-white/10 shadow-sm hover:border-white/20 transition-all flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-bold text-foreground">
                    {camp.name}
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-full border-white/15">
                    {camp.status}
                  </Badge>
                </div>
                <CardDescription className="text-xs text-muted-foreground line-clamp-1">
                  Subject: {camp.subject}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 pt-1">
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Target: {camp.targetAudience.replace("_", " ")}</span>
                  </div>
                  {camp.scheduledAt && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Scheduled: {new Date(camp.scheduledAt).toLocaleDateString("en-IN")}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 p-2 rounded-xl bg-white/5 text-center text-xs pt-2 border-t border-white/5">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Sent</span>
                    <span className="font-bold text-foreground">{camp.sentCount || 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Opens</span>
                    <span className="font-bold text-emerald-400">{camp.openCount || 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Clicks</span>
                    <span className="font-bold text-blue-400">{camp.clickCount || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Create Campaign Dialog ── */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="sm:max-w-md glass border-white/10 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Megaphone className="h-4 w-4 text-emerald-500" />
              Create Email Campaign
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure an outreach broadcast or nurture sequence for your pipeline contacts.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Campaign Title *</Label>
              <Input
                placeholder="e.g. Q4 Festive Business Solutions Outreach"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Email Subject Line *</Label>
              <Input
                placeholder="Exclusive B2B pricing proposal for your team"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Target Audience</Label>
              <select
                className="w-full text-xs bg-background/50 border border-white/10 rounded-lg p-2 text-foreground"
                value={form.targetAudience}
                onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
              >
                <option value="QUALIFIED_LEADS">Qualified Leads (High Intent)</option>
                <option value="ALL_LEADS">All Unconverted Leads</option>
                <option value="EXISTING_CUSTOMERS">Existing Invoiced Customers</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Email Body / Template</Label>
              <Textarea
                placeholder="Hi {{name}}, we're reaching out regarding..."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={3}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setOpenModal(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
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
