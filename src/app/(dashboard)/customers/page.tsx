import { getCustomers } from "@/actions/customer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { Plus, Users, Pencil, Building2 } from "lucide-react"
import { CustomerSearch } from "@/components/customers/customer-search"
import { Suspense } from "react"

interface CustomersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CustomersPage(props: CustomersPageProps) {
  const searchParams = await props.searchParams
  const page = typeof searchParams?.page === "string" ? parseInt(searchParams.page, 10) : 1
  const search = typeof searchParams?.search === "string" ? searchParams.search : undefined
  const limit = 20

  const { customers, total, totalPages } = await getCustomers({ search, page, limit })

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Customers
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your clients and their billing details.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Suspense fallback={<div className="h-9 w-[200px] bg-white/5 rounded-lg animate-pulse" />}>
            <CustomerSearch />
          </Suspense>
          <Link href="/customers/new">
            <Button
              size="sm"
              className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-lg gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add Customer
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Table Card ── */}
      <Card className="glass glass-card border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            All Customers
            <span className="text-xs text-muted-foreground font-normal">{total} total</span>
          </CardTitle>
        </CardHeader>
        <Separator className="bg-white/8" />
        <CardContent className="p-0">
          {customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-medium">No customers found</p>
                <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or add a new customer.</p>
              </div>
              <Link href="/customers/new">
                <Button className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white gap-1.5">
                  <Plus className="h-4 w-4" /> Add Customer
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/8 hover:bg-transparent">
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Name</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Company</TableHead>
                    <TableHead className="hidden md:table-cell text-xs uppercase tracking-wider text-muted-foreground">GSTIN</TableHead>
                    <TableHead className="hidden md:table-cell text-xs uppercase tracking-wider text-muted-foreground">State</TableHead>
                    <TableHead className="hidden sm:table-cell text-xs uppercase tracking-wider text-muted-foreground">Email</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow
                      key={customer.id}
                      className="border-white/5 hover:bg-white/4 transition-colors group"
                    >
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>
                        {customer.companyName ? (
                          <span className="flex items-center gap-1.5 text-sm">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            {customer.companyName}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                        {customer.gstin || "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {customer.state || "—"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                        {customer.email || "—"}
                      </TableCell>
                      <TableCell>
                        <Link href={`/customers/${customer.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity h-7 px-2 gap-1.5 text-xs hover:bg-white/8"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-white/5 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
                  </p>
                  <div className="flex gap-2">
                    <Link 
                      href={`?${new URLSearchParams({ ...(search ? { search } : {}), page: String(Math.max(1, page - 1)) }).toString()}`} 
                      className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                    >
                      <Button variant="outline" size="sm" className="glass border-white/10" disabled={page <= 1}>Previous</Button>
                    </Link>
                    <Link 
                      href={`?${new URLSearchParams({ ...(search ? { search } : {}), page: String(Math.min(totalPages, page + 1)) }).toString()}`} 
                      className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                    >
                      <Button variant="outline" size="sm" className="glass border-white/10" disabled={page >= totalPages}>Next</Button>
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
