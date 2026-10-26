"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Target,
  Search,
  Plus,
  ArrowRight,
  CheckCircle2,
  Building,
  MapPin,
  Mail,
  Phone,
  Briefcase,
  Star,
  Loader2,
  Filter,
} from "lucide-react"
import { toast } from "sonner"
import { convertLead, createLead, updateLead } from "@/actions/crm"

interface LeadsViewProps {
  initialLeads: any[]
}

export function LeadsView({ initialLeads }: LeadsViewProps) {
  const router = useRouter()
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("ALL")
  const [regionFilter, setRegionFilter] = React.useState("ALL")
  const [convertingLead, setConvertingLead] = React.useState<any | null>(null)
  const [dealTitle, setDealTitle] = React.useState("")
  const [dealValue, setDealValue] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  // Filter leads locally for instant interaction
  const filtered = initialLeads.filter((lead) => {
    const matchesSearch =
      !search ||
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      (lead.companyName && lead.companyName.toLowerCase().includes(search.toLowerCase())) ||
      (lead.region && lead.region.toLowerCase().includes(search.toLowerCase())) ||
      (lead.email && lead.email.toLowerCase().includes(search.toLowerCase()))

    const matchesStatus = statusFilter === "ALL" || lead.status === statusFilter
    const matchesRegion =
      regionFilter === "ALL" ||
      (lead.region && lead.region.toLowerCase().includes(regionFilter.toLowerCase()))

    return matchesSearch && matchesStatus && matchesRegion
  })

  const handleOpenConvert = (lead: any) => {
    setConvertingLead(lead)
    setDealTitle(`Deal: ${lead.companyName || lead.name}`)
    setDealValue(String(lead.estimatedValue || 50000))
  }

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!convertingLead) return
    setLoading(true)
    try {
      const res = await convertLead(convertingLead.id, {
        createDeal: true,
        dealTitle,
        dealValue: Number(dealValue) || 50000,
      })
      if (res.error) throw new Error(res.error)
      toast.success(`Lead successfully converted to Contact & Deal!`)
      setConvertingLead(null)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to convert lead")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (leadId: string, newStatus: string) => {
    try {
      const res = await updateLead(leadId, { status: newStatus })
      if (res.error) throw new Error(res.error)
      toast.success(`Lead status updated to ${newStatus}`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to update status")
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Filters Bar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads by name, company, email, or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 rounded-xl glass border-white/10 text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 text-xs bg-background/50 border border-white/10 rounded-xl text-foreground"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="UNQUALIFIED">Unqualified</option>
            <option value="CONVERTED">Converted</option>
          </select>

          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="h-9 px-3 text-xs bg-background/50 border border-white/10 rounded-xl text-foreground"
          >
            <option value="ALL">All Regions</option>
            <option value="Bengaluru">Bengaluru</option>
            <option value="Mumbai">Mumbai</option>
            <option value="Delhi">Delhi NCR</option>
            <option value="Hyderabad">Hyderabad</option>
            <option value="Chennai">Chennai</option>
          </select>
        </div>
      </div>

      {/* ── Leads Grid / Table ── */}
      {filtered.length === 0 ? (
        <Card className="glass border-white/10 p-12 text-center">
          <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <h3 className="text-base font-semibold text-foreground">No leads found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {initialLeads.length === 0
              ? "Start capturing inbound prospects by clicking the '+ New' button in the header."
              : "No leads matched your search and filter criteria."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((lead) => {
            const isConverted = lead.status === "CONVERTED"
            return (
              <Card
                key={lead.id}
                className={`glass border-white/10 shadow-sm transition-all hover:border-white/20 flex flex-col justify-between ${
                  isConverted ? "opacity-75 bg-white/3" : ""
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground hover:underline cursor-pointer">
                        {lead.name}
                      </CardTitle>
                      {lead.companyName && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Building className="h-3 w-3" />
                          <span>{lead.companyName}</span>
                        </p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        lead.status === "QUALIFIED"
                          ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                          : lead.status === "CONVERTED"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          : lead.status === "NEW"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-white/5 text-muted-foreground"
                      }`}
                    >
                      {lead.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-1">
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {lead.region && (
                      <div className="flex items-center gap-1.5 text-foreground font-medium">
                        <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                        <span>{lead.region}</span>
                      </div>
                    )}
                    {lead.email && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">{lead.email}</span>
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{lead.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Estimated Deal</span>
                      <span className="font-bold text-emerald-400">
                        ₹{(lead.estimatedValue || 0).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                      <span className="font-bold text-foreground">{lead.score || 20}</span>
                      <span className="text-[10px] text-muted-foreground">pts</span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 flex items-center justify-between gap-2">
                    {!isConverted ? (
                      <>
                        <select
                          value={lead.status}
                          onChange={(e) => handleUpdateStatus(lead.id, e.target.value)}
                          className="h-8 text-[11px] bg-background/50 border border-white/10 rounded-lg px-2 text-foreground"
                        >
                          <option value="NEW">New</option>
                          <option value="CONTACTED">Contacted</option>
                          <option value="QUALIFIED">Qualified</option>
                          <option value="UNQUALIFIED">Unqualified</option>
                        </select>

                        <Button
                          size="sm"
                          onClick={() => handleOpenConvert(lead)}
                          className="h-8 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Convert</span>
                        </Button>
                      </>
                    ) : (
                      <div className="w-full text-center py-1 text-xs text-blue-400 font-semibold bg-blue-500/10 rounded-lg border border-blue-500/20">
                        Converted to Customer & Deal
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Convert Lead Dialog ── */}
      <Dialog open={!!convertingLead} onOpenChange={(open) => !open && setConvertingLead(null)}>
        <DialogContent className="sm:max-w-md glass border-white/10 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Convert Lead: {convertingLead?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              This will convert the prospect into a Contact in your customer directory and create an active opportunity in your sales pipeline.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConvert} className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Opportunity / Deal Title *</Label>
              <Input
                value={dealTitle}
                onChange={(e) => setDealTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Initial Deal Value (₹) *</Label>
              <Input
                type="number"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                required
              />
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1">
              <p className="font-semibold text-foreground">Summary of actions:</p>
              <ul className="list-disc pl-4 text-muted-foreground space-y-0.5 text-[11px]">
                <li>Create customer profile for <strong className="text-foreground">{convertingLead?.companyName || convertingLead?.name}</strong></li>
                <li>Add deal to Discovery stage in Sales Pipeline</li>
                <li>Mark lead status as <strong className="text-emerald-400">CONVERTED</strong></li>
              </ul>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setConvertingLead(null)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                {loading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                Confirm & Convert
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
