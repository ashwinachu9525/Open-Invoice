import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function InvoicesLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32 bg-white/8" />
          <Skeleton className="h-4 w-52 bg-white/5" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-lg bg-white/8" />
          <Skeleton className="h-9 w-32 rounded-lg bg-white/8" />
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="glass glass-card border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg bg-white/8" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-16 bg-white/5" />
                  <Skeleton className="h-6 w-20 bg-white/8" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table skeleton */}
      <Card className="glass glass-card border-white/10">
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-28 bg-white/8" />
        </CardHeader>
        <CardContent className="p-0 pt-2">
          <div className="px-4 pb-4 space-y-3">
            {/* Header row */}
            <div className="flex gap-4 pb-2 border-b border-white/8">
              {["w-24", "w-32", "w-24", "w-20", "w-16"].map((w, i) => (
                <Skeleton key={i} className={`h-3 ${w} bg-white/5`} />
              ))}
            </div>
            {/* Data rows */}
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-4 items-center py-2">
                <Skeleton className="h-4 w-24 bg-white/8" />
                <Skeleton className="h-4 w-32 bg-white/5" />
                <Skeleton className="h-4 w-24 bg-white/5" />
                <Skeleton className="h-4 w-20 bg-white/8" />
                <Skeleton className="h-5 w-16 rounded-full bg-white/8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
