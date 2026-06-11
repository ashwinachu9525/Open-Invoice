"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { formatINR } from "@/services/tax-engine"
import { Clock, Trash2, Copy, MoreHorizontal } from "lucide-react"
import { toast } from "sonner"
import { bulkDeleteQuotations, cloneQuotation } from "@/actions/quotation"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const statusConfig: Record<string, { label: string; class: string }> = {
  DRAFT:          { label: "Draft",          class: "bg-gray-500/20 text-gray-400 border-gray-500/30 border" },
  SENT:           { label: "Sent",           class: "bg-blue-500/20 text-blue-400 border-blue-500/30 border" },
  ACCEPTED:       { label: "Accepted",       class: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 border" },
  REJECTED:       { label: "Rejected",       class: "bg-red-500/20 text-red-400 border-red-500/30 border" },
  EXPIRED:        { label: "Expired",        class: "bg-orange-500/20 text-orange-400 border-orange-500/30 border" },
  INVOICED:       { label: "Invoiced",       class: "bg-purple-500/20 text-purple-400 border-purple-500/30 border" },
}

interface QuotationListClientProps {
  quotations: any[]
  currentPage: number
  limit: number
  totalPages: number
  totalQuotations: number
  searchParamsProps: Record<string, string | undefined>
}

export function QuotationListClient({ quotations, currentPage, limit, totalPages, totalQuotations, searchParamsProps }: QuotationListClientProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCloning, setIsCloning] = useState<string | null>(null)

  const toggleSelectAll = () => {
    if (selectedIds.length === quotations.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(quotations.map((inv) => inv.id))
    }
  }

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleBulkDelete = async () => {
    setIsDeleting(true)
    const res = await bulkDeleteQuotations(selectedIds)
    setIsDeleting(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(`${selectedIds.length} quotations deleted`)
      setSelectedIds([])
    }
  }

  const handleClone = async (id: string) => {
    setIsCloning(id)
    const res = await cloneQuotation(id)
    setIsCloning(null)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("Quotation cloned successfully")
      if (res.id) router.push(`/quotations/${res.id}/edit`)
    }
  }

  return (
    <>
      {selectedIds.length > 0 && (
        <div className="bg-primary/10 border border-primary/20 p-2 px-4 rounded-md flex items-center justify-between mb-4 animate-in fade-in slide-in-from-top-2">
          <span className="text-sm font-medium text-primary">{selectedIds.length} quotations selected</span>
          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger className={cn(buttonVariants({ variant: "destructive", size: "sm" }), "h-8 gap-1.5", isDeleting ? "pointer-events-none opacity-50" : "")}>
                <Trash2 className="w-3.5 h-3.5" />
                {isDeleting ? "Deleting..." : "Delete Selected"}
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {selectedIds.length} quotations?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will move the selected quotations to the trash. You can restore them later or permanently delete them from the trash page.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow className="border-white/8 hover:bg-transparent">
            <TableHead className="w-12 text-center">
              <Checkbox 
                checked={selectedIds.length === quotations.length && quotations.length > 0} 
                onCheckedChange={toggleSelectAll} 
              />
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Quotation #</TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Customer</TableHead>
            <TableHead className="hidden md:table-cell text-xs uppercase tracking-wider text-muted-foreground">Date</TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Amount</TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Status</TableHead>
            <TableHead className="text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotations.map((inv) => (
            <TableRow
              key={inv.id}
              className="border-white/5 hover:bg-white/4 transition-colors group"
            >
              <TableCell className="w-12 text-center">
                <Checkbox 
                  checked={selectedIds.includes(inv.id)} 
                  onCheckedChange={() => toggleSelect(inv.id)} 
                />
              </TableCell>
              <TableCell className="font-mono text-sm font-medium">{inv.quotationNumber}</TableCell>
              <TableCell className="font-medium">{inv.customer.name}</TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                {new Date(inv.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </TableCell>
              <TableCell className="font-semibold">{formatINR(inv.finalAmount)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[inv.status]?.class ?? ""}`}>
                    {statusConfig[inv.status]?.label ?? inv.status.replace("_", " ")}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/quotations/${inv.id}`}
                    className="text-xs font-medium text-primary hover:underline opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                  >
                    View →
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8 text-muted-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100")}>
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass border-white/10">
                      <DropdownMenuItem onClick={() => handleClone(inv.id)} disabled={isCloning === inv.id}>
                        <Copy className="mr-2 h-4 w-4" />
                        {isCloning === inv.id ? "Cloning..." : "Clone to Draft"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      <div className="p-4 border-t border-white/5 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, totalQuotations)} of {totalQuotations}
        </p>
        <div className="flex gap-2">
          <Link href={`?${new URLSearchParams({ ...searchParamsProps, page: String(Math.max(1, currentPage - 1)) }).toString()}`} className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}>
            <Button variant="outline" size="sm" className="glass border-white/10" disabled={currentPage <= 1}>Previous</Button>
          </Link>
          <Link href={`?${new URLSearchParams({ ...searchParamsProps, page: String(Math.min(totalPages, currentPage + 1)) }).toString()}`} className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}>
            <Button variant="outline" size="sm" className="glass border-white/10" disabled={currentPage >= totalPages}>Next</Button>
          </Link>
        </div>
      </div>
    </>
  )
}
