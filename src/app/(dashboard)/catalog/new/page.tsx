import { Metadata } from "next"
import { CatalogForm } from "@/components/forms/catalog-form"

export const metadata: Metadata = {
  title: "Add Product / Service | InvoiceAI",
  description: "Add a new item to your catalog",
}

export default function NewCatalogItemPage() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Add Item</h2>
      </div>

      <div className="glass rounded-xl border border-white/10 p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        <CatalogForm />
      </div>
    </div>
  )
}
