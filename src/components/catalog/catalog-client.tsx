"use client"

import { useState } from "react"
import { ProductCatalog } from "@prisma/client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button, buttonVariants } from "@/components/ui/button"
import { Edit, Trash2, Search, Package } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatINR } from "@/services/tax-engine"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { deleteCatalogItem } from "@/actions/catalog"
import { toast } from "sonner"
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

export function CatalogClient({ initialItems }: { initialItems: ProductCatalog[] }) {
  const [items, setItems] = useState(initialItems)
  const [search, setSearch] = useState("")
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) || 
    (item.description && item.description.toLowerCase().includes(search.toLowerCase())) ||
    (item.hsnSac && item.hsnSac.toLowerCase().includes(search.toLowerCase()))
  )

  const handleDelete = async (id: string) => {
    setIsDeleting(id)
    const res = await deleteCatalogItem(id)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("Item deleted from catalog")
      setItems(items.filter(i => i.id !== id))
    }
    setIsDeleting(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search catalog..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-black/20 border-white/10"
          />
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-16 px-4 border border-dashed border-white/10 rounded-lg bg-black/20 flex flex-col items-center justify-center">
          <Package className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">No products found</h3>
          <p className="text-muted-foreground mb-4 max-w-sm mx-auto text-sm">
            {search ? "Try adjusting your search criteria." : "Start building your product and service catalog to save time when creating invoices."}
          </p>
          {!search && (
            <Link href="/catalog/new">
              <Button variant="outline" className="border-indigo-500/30 hover:bg-indigo-500/10 text-indigo-400">
                Add your first item
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-md border border-white/10 bg-black/20 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead>Item Name</TableHead>
                <TableHead>HSN/SAC</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Tax Rate</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id} className="border-white/5 group">
                  <TableCell>
                    <div className="font-medium text-foreground">{item.name}</div>
                    {item.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1 max-w-[300px]">
                        {item.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {item.hsnSac || "—"}
                  </TableCell>
                  <TableCell>
                    {formatINR(item.unitPrice)}
                    {item.unit && <span className="text-muted-foreground text-xs ml-1">/ {item.unit}</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-white/5 border-white/10 font-mono">
                      {item.taxPercentage}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Edit functionality to be implemented as stretch goal, or just link to /catalog/[id]/edit */}
                      <AlertDialog>
                        <AlertDialogTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/20", isDeleting === item.id ? "pointer-events-none opacity-50" : "")}>
                          <Trash2 className="h-4 w-4" />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete from catalog?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove <strong>{item.name}</strong> from your catalog. It will not affect existing invoices that already used this item.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete Item
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
    </div>
  )
}
