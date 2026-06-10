import { DashboardSkeleton } from "@/components/ui/dashboard-skeleton"

export default function DashboardLoading() {
  return (
    <div className="animate-in fade-in duration-500">
      <DashboardSkeleton />
    </div>
  )
}
