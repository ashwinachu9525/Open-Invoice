"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Building, Clock, CheckCircle2, AlertCircle, Sparkles } from "lucide-react"
import { AdminCompanyActions } from "./admin-company-actions"
import { AdminTrialActions } from "./admin-trial-actions"

interface CompanyItem {
  id: string
  name: string
  subscriptionTier: string
  trialStartsAt: Date | null
  trialEndsAt: Date | null
  trialReminderSentAt?: Date | null
  proRequestStatus?: string | null
  users: { id: string; email: string | null; name: string | null }[]
}

interface AdminCompanyFilterProps {
  companies: CompanyItem[]
}

export function AdminCompanyFilter({ companies }: AdminCompanyFilterProps) {
  const [search, setSearch] = useState("")
  const [filterTier, setFilterTier] = useState<string>("ALL")

  const now = useMemo(() => new Date(), [])

  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      // 1. Search filter
      const matchesSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.id.toLowerCase().includes(search.toLowerCase()) ||
        c.users.some(
          (u) =>
            (u.email && u.email.toLowerCase().includes(search.toLowerCase())) ||
            (u.name && u.name.toLowerCase().includes(search.toLowerCase()))
        )

      if (!matchesSearch) return false

      // 2. Tier / Trial filter
      const endsDate = c.trialEndsAt ? new Date(c.trialEndsAt) : null
      const isTrialActive = endsDate && now < endsDate
      const isTrialExpired = endsDate && now >= endsDate

      if (filterTier === "ALL") return true
      if (filterTier === "TRIAL_ACTIVE") return isTrialActive
      if (filterTier === "TRIAL_EXPIRED") return isTrialExpired
      if (filterTier === "PRO") return c.subscriptionTier === "PRO" || c.subscriptionTier === "ENTERPRISE"
      if (filterTier === "FREE") return c.subscriptionTier === "FREE" && !isTrialActive

      return true
    })
  }, [companies, search, filterTier, now])

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search company name, ID, or user email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-900 border-white/10"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: "ALL", label: `All (${companies.length})` },
            { id: "PRO", label: "Pro / Enterprise" },
            { id: "TRIAL_ACTIVE", label: "Active Trials" },
            { id: "TRIAL_EXPIRED", label: "Expired Trials" },
            { id: "FREE", label: "Free Plan" },
          ].map((pill) => (
            <Button
              key={pill.id}
              type="button"
              variant={filterTier === pill.id ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterTier(pill.id)}
              className={`text-xs h-8 px-2.5 rounded-lg border-white/10 shrink-0 ${
                filterTier === pill.id
                  ? "bg-amber-600 hover:bg-amber-500 text-white font-medium"
                  : "hover:bg-white/5 text-muted-foreground"
              }`}
            >
              {pill.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-slate-900/80">
            <tr>
              <th className="px-4 py-3 font-medium">Company Name &amp; ID</th>
              <th className="px-4 py-3 font-medium">Plan Tier</th>
              <th className="px-4 py-3 font-medium">Trial Start</th>
              <th className="px-4 py-3 font-medium">Trial End</th>
              <th className="px-4 py-3 font-medium">Status / Days Left</th>
              <th className="px-4 py-3 font-medium">Users</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-slate-950/40">
            {filteredCompanies.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                  No matching companies found.
                </td>
              </tr>
            ) : (
              filteredCompanies.map((c) => {
                const endsDate = c.trialEndsAt ? new Date(c.trialEndsAt) : null
                const isTrialActive = endsDate && now < endsDate
                const isTrialExpired = endsDate && now >= endsDate

                let daysRemaining = 0
                if (endsDate && isTrialActive) {
                  const diffTime = endsDate.getTime() - now.getTime()
                  daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                }

                return (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-semibold">
                      <div className="text-slate-100">{c.name || "Unnamed Company"}</div>
                      <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[140px]">
                        {c.id}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                          c.subscriptionTier === "PRO"
                            ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                            : c.subscriptionTier === "ENTERPRISE"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : isTrialActive
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                        }`}
                      >
                        {isTrialActive ? "TRIAL (PRO)" : c.subscriptionTier}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {c.trialStartsAt ? new Date(c.trialStartsAt).toLocaleDateString() : "—"}
                    </td>

                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {c.trialEndsAt ? new Date(c.trialEndsAt).toLocaleDateString() : "—"}
                    </td>

                    <td className="px-4 py-3">
                      {isTrialActive ? (
                        <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {daysRemaining} {daysRemaining === 1 ? "day" : "days"} left
                        </span>
                      ) : isTrialExpired ? (
                        <span className="text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                          Expired
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-300">
                      <span className="font-semibold text-slate-100">{c.users?.length || 0}</span>{" "}
                      {c.users?.length === 1 ? "member" : "members"}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <AdminTrialActions
                          companyId={c.id}
                          hasTrial={Boolean(c.trialEndsAt && new Date(c.trialEndsAt) > now)}
                          subscriptionTier={c.subscriptionTier}
                        />
                        <AdminCompanyActions
                          companyId={c.id}
                          currentTier={c.subscriptionTier}
                          trialEndsAt={c.trialEndsAt ? new Date(c.trialEndsAt) : null}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
