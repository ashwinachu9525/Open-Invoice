import { TableSkeleton } from "@/components/ui/table-skeleton"

export default function CustomersLoading() {
  return (
    <div className="animate-in fade-in duration-500">
      <TableSkeleton />
    </div>
  )
}
