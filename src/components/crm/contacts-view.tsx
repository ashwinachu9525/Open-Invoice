"use client"

import * as React from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Search,
  Building,
  Mail,
  Phone,
  FileText,
  Briefcase,
  ExternalLink,
  MapPin,
} from "lucide-react"

interface ContactsViewProps {
  initialContacts: any[]
}

export function ContactsView({ initialContacts }: ContactsViewProps) {
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("ALL")

  const filtered = initialContacts.filter((contact) => {
    const matchesSearch =
      !search ||
      contact.name.toLowerCase().includes(search.toLowerCase()) ||
      (contact.companyName && contact.companyName.toLowerCase().includes(search.toLowerCase())) ||
      (contact.email && contact.email.toLowerCase().includes(search.toLowerCase())) ||
      (contact.gstin && contact.gstin.toLowerCase().includes(search.toLowerCase()))

    const matchesStatus = statusFilter === "ALL" || contact.crmStatus === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-4">
      {/* ── Filters Bar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts by name, company, email or GSTIN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 rounded-xl glass border-white/10 text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 text-xs bg-background/50 border border-white/10 rounded-xl text-foreground"
          >
            <option value="ALL">All Account Statuses</option>
            <option value="ACTIVE">Active Clients</option>
            <option value="PROSPECT">Prospects</option>
            <option value="LEAD">Leads</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* ── Contacts Directory ── */}
      {filtered.length === 0 ? (
        <Card className="glass border-white/10 p-12 text-center">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <h3 className="text-base font-semibold text-foreground">No contacts found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {initialContacts.length === 0
              ? "Your contact directory is currently empty. Use the '+ New' button to add a contact or convert a lead."
              : "No contacts match your query."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((contact) => (
            <Card key={contact.id} className="glass border-white/10 shadow-sm hover:border-white/20 transition-all flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">
                      {contact.companyName || contact.name}
                    </CardTitle>
                    {contact.companyName && contact.name && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Contact: {contact.name}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0.5 rounded-full border-white/15">
                    {contact.crmStatus || "ACTIVE"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pt-1">
                <div className="space-y-1 text-xs text-muted-foreground">
                  {contact.state && (
                    <div className="flex items-center gap-1.5 text-foreground font-medium">
                      <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                      <span>{contact.state}, {contact.country || "India"}</span>
                    </div>
                  )}
                  {contact.email && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{contact.phone}</span>
                    </div>
                  )}
                  {contact.gstin && (
                    <div className="text-[11px] font-mono text-muted-foreground">
                      GSTIN: <span className="text-foreground">{contact.gstin}</span>
                    </div>
                  )}
                </div>

                {/* Financial & Pipeline summary */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-xs">
                  <div className="p-2 rounded-lg bg-white/5">
                    <span className="text-[10px] text-muted-foreground block flex items-center gap-1">
                      <Briefcase className="h-3 w-3 text-amber-400" /> Deals Value
                    </span>
                    <span className="font-bold text-foreground">
                      ₹{(contact.totalDealsValue || 0).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-white/5">
                    <span className="text-[10px] text-muted-foreground block flex items-center gap-1">
                      <FileText className="h-3 w-3 text-blue-400" /> Total Invoiced
                    </span>
                    <span className="font-bold text-foreground">
                      ₹{(contact.totalInvoiced || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Footer action to view invoice statement of account */}
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {contact.deals?.length || 0} deals • {contact.invoices?.length || 0} invoices
                  </span>
                  <Link
                    href={`/customers/${contact.id}`}
                    className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <span>Ledger & History</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
