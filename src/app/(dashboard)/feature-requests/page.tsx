import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getFeatureRequests } from "@/app/actions/feature-requests";
import { Lightbulb, MessageSquare, ChevronUp, Layers } from "lucide-react";
import { SubmitIdeaDialog } from "@/components/feature-requests/submit-idea-dialog";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function FeatureRequestsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { requests } = await getFeatureRequests();

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-amber-400" />
            Feedback Board
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Vote on existing ideas or suggest new ones.
          </p>
        </div>
        <SubmitIdeaDialog />
      </div>

      <div className="grid gap-4">
        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border rounded-xl border-dashed">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary mb-4">
              <Lightbulb className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-medium">No requests yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              Be the first to suggest a new feature or enhancement!
            </p>
          </div>
        ) : (
          requests.map((req) => (
            <Link 
              key={req.id} 
              href={`/feature-requests/${req.id}`}
              className="block group"
            >
              <div className="glass glass-card p-5 rounded-xl border border-white/5 transition-colors hover:bg-white/5 flex flex-col sm:flex-row gap-4 sm:items-center">
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-base font-semibold truncate group-hover:text-primary transition-colors">
                      {req.title}
                    </h3>
                    {req.category && (
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-medium">
                        {req.category}
                      </Badge>
                    )}
                    <StatusBadge status={req.status} />
                  </div>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {req.description}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{req.user.name || req.user.email}</span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:ml-auto">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 text-sm font-medium">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    <span>{req._count.comments}</span>
                  </div>
                  {req._count.mergedRequests > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 text-sm font-medium">
                      <Layers className="w-4 h-4 text-muted-foreground" />
                      <span>{req._count.mergedRequests}</span>
                    </div>
                  )}
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${req.upvotes.length > 0 ? 'bg-primary/20 text-primary border-primary/30' : 'bg-white/5 border-transparent'}`}>
                    <ChevronUp className="w-4 h-4" />
                    <span>{req._count.upvotes}</span>
                  </div>
                </div>
                
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  let colorClass = "bg-slate-500/10 text-slate-400 border-slate-500/20";
  
  switch (status.toUpperCase()) {
    case "OPEN":
      colorClass = "bg-blue-500/10 text-blue-400 border-blue-500/20";
      break;
    case "IN PROGRESS":
      colorClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
      break;
    case "PLANNED":
      colorClass = "bg-purple-500/10 text-purple-400 border-purple-500/20";
      break;
    case "UNDER REVIEW":
      colorClass = "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      break;
    case "COMPLETE":
      colorClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      break;
    case "CLOSED":
      colorClass = "bg-red-500/10 text-red-400 border-red-500/20";
      break;
    case "ACKNOWLEDGED":
      colorClass = "bg-teal-500/10 text-teal-400 border-teal-500/20";
      break;
  }

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border uppercase tracking-wider ${colorClass}`}>
      {status}
    </span>
  );
}
