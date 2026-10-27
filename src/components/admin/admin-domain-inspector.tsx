"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { checkDomainDnsHealth } from "@/actions/admin-tools"
import { toast } from "sonner"
import { Globe, Search, Loader2, CheckCircle2, XCircle, ExternalLink, ShieldCheck } from "lucide-react"

export function AdminDomainInspector() {
  const [domain, setDomain] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any | null>(null)

  async function handleInspect(e: React.FormEvent) {
    e.preventDefault()
    if (!domain.trim()) return

    setLoading(true)
    setResult(null)

    try {
      const res = await checkDomainDnsHealth(domain)
      setResult(res)
      if (res.success && res.hasRecords) {
        toast.success(`DNS records resolved for ${res.domain}`)
      } else if (res.success && !res.hasRecords) {
        toast.warning("No A or CNAME DNS records found.")
      } else {
        toast.error(res.error || "Domain inspection failed.")
      }
    } catch {
      toast.error("An error occurred during DNS lookup.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-sky-500/20 shadow-lg shadow-sky-500/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="w-5 h-5 text-sky-400" />
            Custom Domain &amp; DNS Health Inspector
          </CardTitle>
          <div className="flex items-center gap-2 bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/20 text-xs font-semibold text-sky-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            Network Resolver
          </div>
        </div>
        <CardDescription>
          Diagnose tenant custom domains, verify CNAME records for white-labeled invoice portals, and test live HTTPS status.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <form onSubmit={handleInspect} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="e.g. invoice.company.com or your custom domain..."
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="bg-slate-900 border-white/10"
              required
            />
          </div>
          <Button
            type="submit"
            disabled={loading || !domain.trim()}
            className="sm:w-44 bg-sky-600 hover:bg-sky-500 text-white gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Resolving...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Inspect Domain
              </>
            )}
          </Button>
        </form>

        {result && (
          <div
            className={`p-4 rounded-xl border ${
              result.success && result.hasRecords
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-amber-500/10 border-amber-500/20 text-amber-400"
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {result.hasRecords ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-amber-400" />
                  )}
                  <span className="font-bold text-sm text-slate-100 font-mono">
                    {result.domain}
                  </span>
                </div>
                <a
                  href={`https://${result.domain}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-sky-400 hover:underline"
                >
                  Visit Domain <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-black/40 p-3 rounded-lg border border-white/5">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                    CNAME Records (Alias)
                  </span>
                  <div className="font-mono text-slate-200 mt-1">
                    {result.records?.cname?.length > 0 ? (
                      result.records.cname.map((c: string) => <div key={c}>{c}</div>)
                    ) : (
                      <span className="text-slate-500">None configured</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                    A Records (IPv4)
                  </span>
                  <div className="font-mono text-slate-200 mt-1">
                    {result.records?.a?.length > 0 ? (
                      result.records.a.map((ip: string) => <div key={ip}>{ip}</div>)
                    ) : (
                      <span className="text-slate-500">None configured</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                    HTTPS Ping Status
                  </span>
                  <span className="font-mono text-slate-200 mt-1 block">
                    {result.httpStatus}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                    Network Latency
                  </span>
                  <span className="font-mono text-slate-200 mt-1 block">
                    {result.latencyMs >= 0 ? `${result.latencyMs} ms` : "Unreachable"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
