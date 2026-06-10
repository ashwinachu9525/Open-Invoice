import { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Mail, CheckCircle2, XCircle } from "lucide-react"

export const metadata: Metadata = {
  title: "Email Logs | InvoiceAI",
  description: "View history of sent emails",
}

export default async function EmailLogsPage() {
  const session = await auth()
  if (!session?.user?.companyId) redirect("/login")

  const logs = await prisma.emailLog.findMany({
    where: { companyId: session.user.companyId },
    orderBy: { sentAt: "desc" },
    take: 100,
    include: { invoice: { select: { invoiceNumber: true } } }
  })

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Email Logs</h2>
      </div>

      <div className="glass rounded-xl border border-white/10 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        
        {logs.length === 0 ? (
          <div className="text-center py-16 px-4 flex flex-col items-center justify-center">
            <Mail className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">No emails sent yet</h3>
            <p className="text-muted-foreground text-sm">When you send invoices via email, the history will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Related To</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="border-white/5">
                    <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                      {format(new Date(log.sentAt), "MMM d, yyyy • h:mm a")}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {log.to}
                    </TableCell>
                    <TableCell className="text-sm max-w-[250px] truncate" title={log.subject}>
                      {log.subject}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.invoice?.invoiceNumber || "—"}
                    </TableCell>
                    <TableCell>
                      {log.status === "sent" ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1.5 pl-1.5">
                          <CheckCircle2 className="w-3 h-3" /> Sent
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 gap-1.5 pl-1.5" title={log.error || "Failed"}>
                          <XCircle className="w-3 h-3" /> Failed
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
