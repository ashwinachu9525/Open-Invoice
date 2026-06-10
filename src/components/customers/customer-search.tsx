"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { Search } from "lucide-react"

export function CustomerSearch() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const search = formData.get("search") as string
        const params = new URLSearchParams(searchParams.toString())
        if (search) params.set("search", search)
        else params.delete("search")
        params.delete("page") // Reset to page 1 on new search
        startTransition(() => router.push(`${pathname}?${params.toString()}`))
      }}
      className="relative"
    >
      <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none text-muted-foreground">
        <Search className="h-4 w-4" />
      </div>
      <input
        name="search"
        type="search"
        placeholder="Search customers..."
        defaultValue={searchParams.get("search") ?? ""}
        className="h-9 w-[200px] sm:w-[300px] rounded-lg border border-white/10 bg-black/20 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
      />
    </form>
  )
}
