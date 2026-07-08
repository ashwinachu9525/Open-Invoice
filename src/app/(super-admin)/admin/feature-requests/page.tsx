import { getFeatureRequests } from "@/app/actions/feature-requests";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import Link from "next/link";
import { AdminManageDialog } from "@/components/feature-requests/admin-manage-dialog";
import { Input } from "@/components/ui/input";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants, Button } from "@/components/ui/button";

export const metadata = {
  title: "Feature Requests - Admin",
};

const ITEMS_PER_PAGE = 20;

export default async function AdminFeatureRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const params = await searchParams;
  const query = params.q || "";
  const currentPage = Number(params.page) || 1;

  const { requests, total } = await getFeatureRequests({
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    search: query,
  });

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Feature Requests</h1>
        <p className="text-muted-foreground mt-1">
          Review ideas and feature requests submitted by users.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submitted Requests</CardTitle>
          <CardDescription>
            Showing {requests.length} of {total} request(s)
          </CardDescription>
          <form className="flex w-full max-w-sm items-center space-x-2 pt-4">
            <Input type="text" name="q" placeholder="Search feature requests..." defaultValue={query} />
            <Button type="submit" variant="secondary">
              <Search className="w-4 h-4 mr-2" /> Search
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-white/10 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                <TableRow>
                  <TableHead className="w-[200px]">Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[200px]">User</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[150px]">Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No feature requests found.
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <div className="font-medium">{req.title}</div>
                        <div className="text-[10px] font-mono text-muted-foreground mt-1 select-all" title="Request ID">
                          {req.id}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[400px]">
                        <p className="line-clamp-2 text-muted-foreground">{req.description}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{req.user?.name || "Unknown"}</span>
                          <span className="text-xs text-muted-foreground">{req.user?.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                          {req.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(req.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link 
                            href={`/admin/feature-requests/${req.id}`}
                            className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3"
                          >
                            View
                          </Link>
                          <AdminManageDialog featureRequestId={req.id} currentStatus={req.status} title={req.title} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6">
              <div className="text-sm text-muted-foreground">
                Showing page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <Link 
                  href={`/admin/feature-requests?page=${currentPage - 1}${query ? `&q=${query}` : ''}`} 
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), currentPage <= 1 ? 'pointer-events-none opacity-50' : '')}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Link>
                <Link 
                  href={`/admin/feature-requests?page=${currentPage + 1}${query ? `&q=${query}` : ''}`} 
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), currentPage >= totalPages ? 'pointer-events-none opacity-50' : '')}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
