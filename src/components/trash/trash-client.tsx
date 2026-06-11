"use client"

import { useState } from "react"
import { Trash2, RefreshCcw, FileText, Users, FileSpreadsheet } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { formatINR } from "@/services/tax-engine"
import { restoreInvoice, permanentlyDeleteInvoice } from "@/actions/invoice"
import { restoreQuotation, permanentlyDeleteQuotation } from "@/actions/quotation"
import { restoreCustomer, permanentlyDeleteCustomer } from "@/actions/trash"
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

interface TrashClientProps {
  invoices: any[]
  quotations: any[]
  customers: any[]
}

export function TrashClient({ invoices, quotations, customers }: TrashClientProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  const handleRestoreInvoice = async (id: string) => {
    setLoadingAction(`restore-inv-${id}`)
    const res = await restoreInvoice(id)
    if (res.error) toast.error(res.error)
    else toast.success("Invoice restored")
    setLoadingAction(null)
  }

  const handleDeleteInvoice = async (id: string) => {
    setLoadingAction(`delete-inv-${id}`)
    const res = await permanentlyDeleteInvoice(id)
    if (res.error) toast.error(res.error)
    else toast.success("Invoice permanently deleted")
    setLoadingAction(null)
  }

  const handleRestoreQuotation = async (id: string) => {
    setLoadingAction(`restore-qt-${id}`)
    const res = await restoreQuotation(id)
    if (res.error) toast.error(res.error)
    else toast.success("Quotation restored")
    setLoadingAction(null)
  }

  const handleDeleteQuotation = async (id: string) => {
    setLoadingAction(`delete-qt-${id}`)
    const res = await permanentlyDeleteQuotation(id)
    if (res.error) toast.error(res.error)
    else toast.success("Quotation permanently deleted")
    setLoadingAction(null)
  }

  const handleRestoreCustomer = async (id: string) => {
    setLoadingAction(`restore-cus-${id}`)
    const res = await restoreCustomer(id)
    if (res.error) toast.error(res.error)
    else toast.success("Customer restored")
    setLoadingAction(null)
  }

  const handleDeleteCustomer = async (id: string) => {
    setLoadingAction(`delete-cus-${id}`)
    const res = await permanentlyDeleteCustomer(id)
    if (res.error) toast.error(res.error)
    else toast.success("Customer permanently deleted")
    setLoadingAction(null)
  }

  return (
    <Tabs defaultValue="invoices" className="w-full">
      <TabsList className="mb-4 bg-white/5 border border-white/10 flex flex-wrap h-auto">
        <TabsTrigger value="invoices" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary gap-2">
          <FileText className="w-4 h-4" />
          Invoices ({invoices.length})
        </TabsTrigger>
        <TabsTrigger value="quotations" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary gap-2">
          <FileSpreadsheet className="w-4 h-4" />
          Quotations ({quotations?.length || 0})
        </TabsTrigger>
        <TabsTrigger value="customers" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary gap-2">
          <Users className="w-4 h-4" />
          Customers ({customers.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="invoices">
        {invoices.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border border-dashed border-white/10 rounded-lg bg-black/20">
            No deleted invoices
          </div>
        ) : (
          <div className="border border-white/10 rounded-lg overflow-hidden bg-black/20 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Deleted At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id} className="border-white/5">
                    <TableCell className="font-mono">{inv.invoiceNumber}</TableCell>
                    <TableCell>{inv.customer?.name}</TableCell>
                    <TableCell>{formatINR(inv.finalAmount)}</TableCell>
                    <TableCell>{new Date(inv.deletedAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 glass border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                          onClick={() => handleRestoreInvoice(inv.id)}
                          disabled={loadingAction !== null}
                        >
                          <RefreshCcw className="w-3 h-3 mr-1" /> Restore
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 glass border-red-500/30 text-red-400 hover:bg-red-500/20", loadingAction !== null ? "pointer-events-none opacity-50" : "")}>
                            <Trash2 className="w-3 h-3 mr-1" /> Delete
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Permanently delete invoice?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to permanently delete this invoice? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteInvoice(inv.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Permanently Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="quotations">
        {!quotations || quotations.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border border-dashed border-white/10 rounded-lg bg-black/20">
            No deleted quotations
          </div>
        ) : (
          <div className="border border-white/10 rounded-lg overflow-hidden bg-black/20 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead>Quotation #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Deleted At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotations.map((qt) => (
                  <TableRow key={qt.id} className="border-white/5">
                    <TableCell className="font-mono">{qt.quotationNumber}</TableCell>
                    <TableCell>{qt.customer?.name}</TableCell>
                    <TableCell>{formatINR(qt.finalAmount)}</TableCell>
                    <TableCell>{new Date(qt.deletedAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 glass border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                          onClick={() => handleRestoreQuotation(qt.id)}
                          disabled={loadingAction !== null}
                        >
                          <RefreshCcw className="w-3 h-3 mr-1" /> Restore
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 glass border-red-500/30 text-red-400 hover:bg-red-500/20", loadingAction !== null ? "pointer-events-none opacity-50" : "")}>
                            <Trash2 className="w-3 h-3 mr-1" /> Delete
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Permanently delete quotation?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to permanently delete this quotation? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteQuotation(qt.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Permanently Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="customers">
        {customers.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border border-dashed border-white/10 rounded-lg bg-black/20">
            No deleted customers
          </div>
        ) : (
          <div className="border border-white/10 rounded-lg overflow-hidden bg-black/20 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Deleted At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((cus) => (
                  <TableRow key={cus.id} className="border-white/5">
                    <TableCell className="font-medium">{cus.name}</TableCell>
                    <TableCell>{cus.email || "—"}</TableCell>
                    <TableCell>{new Date(cus.deletedAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 glass border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                          onClick={() => handleRestoreCustomer(cus.id)}
                          disabled={loadingAction !== null}
                        >
                          <RefreshCcw className="w-3 h-3 mr-1" /> Restore
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 glass border-red-500/30 text-red-400 hover:bg-red-500/20", loadingAction !== null ? "pointer-events-none opacity-50" : "")}>
                            <Trash2 className="w-3 h-3 mr-1" /> Delete
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Permanently delete customer?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to permanently delete this customer? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteCustomer(cus.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Permanently Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
