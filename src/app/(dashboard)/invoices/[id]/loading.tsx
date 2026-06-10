import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function InvoiceDetailLoading() {
  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-40 bg-white/8" />
            <Skeleton className="h-5 w-16 rounded-full bg-white/8" />
          </div>
          <Skeleton className="h-4 w-64 bg-white/5" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32 rounded-lg bg-white/8" />
          <Skeleton className="h-9 w-28 rounded-lg bg-white/8" />
        </div>
      </div>

      {/* Bill From/To */}
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1].map((i) => (
          <Card key={i} className="glass glass-card border-white/10">
            <CardHeader className="pb-2">
              <Skeleton className="h-3 w-20 bg-white/5" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-5 w-40 bg-white/8" />
              <Skeleton className="h-3 w-32 bg-white/5" />
              <Skeleton className="h-3 w-52 bg-white/5" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Line Items */}
      <Card className="glass glass-card border-white/10">
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-24 bg-white/8" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4 py-2 border-b border-white/5">
                <Skeleton className="h-4 flex-1 bg-white/5" />
                <Skeleton className="h-4 w-12 bg-white/5" />
                <Skeleton className="h-4 w-20 bg-white/5" />
                <Skeleton className="h-4 w-12 bg-white/5" />
                <Skeleton className="h-4 w-24 bg-white/8" />
              </div>
            ))}
          </div>
          <div className="mt-4 ml-auto max-w-xs space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-20 bg-white/5" />
                <Skeleton className="h-4 w-24 bg-white/8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
