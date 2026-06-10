import { Skeleton } from "@/components/ui/skeleton"

export default function GenericLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      
      <div className="rounded-xl border border-white/10 bg-black/20 p-6 min-h-[400px] flex flex-col justify-center items-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground/50">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2 text-center">
            <Skeleton className="h-4 w-32 mx-auto" />
            <Skeleton className="h-3 w-48 mx-auto" />
          </div>
        </div>
      </div>
    </div>
  )
}
