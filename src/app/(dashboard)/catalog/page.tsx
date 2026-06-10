import { Metadata } from "next"
import { Plus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getCatalogItems } from "@/actions/catalog"
import { CatalogClient } from "@/components/catalog/catalog-client"

export const metadata: Metadata = {
  title: "Product Catalog | InvoiceAI",
  description: "Manage your products and services",
}

export default async function CatalogPage() {
  const { items, error } = await getCatalogItems()

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Catalog</h2>
        <Link href="/catalog/new">
          <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]">
            <Plus className="w-4 h-4" />
            Add Product / Service
          </Button>
        </Link>
      </div>

      <div className="glass rounded-xl border border-white/10 p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        
        {error ? (
          <div className="text-red-400 p-4 border border-red-500/30 rounded-lg bg-red-500/10">
            {error}
          </div>
        ) : (
          <CatalogClient initialItems={items || []} />
        )}
      </div>
    </div>
  )
}
