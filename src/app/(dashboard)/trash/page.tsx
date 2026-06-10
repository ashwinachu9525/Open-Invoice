import { getDeletedItems } from "@/actions/trash"
import { TrashClient } from "@/components/trash/trash-client"
import { Trash2 } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function TrashPage() {
  const { invoices, customers } = await getDeletedItems()

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto w-full">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-red-500/10 rounded-xl border border-red-500/20">
          <Trash2 className="w-6 h-6 text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trash</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage deleted invoices and customers.</p>
        </div>
      </div>

      <div className="glass glass-card border border-white/10 p-6 rounded-xl">
        <TrashClient invoices={invoices} customers={customers} />
      </div>
    </div>
  )
}
