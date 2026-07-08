import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getFeatureRequestById } from "@/app/actions/feature-requests";
import { Lightbulb, ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { CommentsSection } from "@/components/feature-requests/comments-section";
import { AdminControls } from "@/components/feature-requests/admin-controls";
import { ChevronUp } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feature Request | Open Invoice",
};

export default async function FeatureRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const request = await getFeatureRequestById(id);

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h2 className="text-xl font-bold mb-2">Request Not Found</h2>
        <p className="text-muted-foreground mb-6">The feature request you are looking for does not exist or has been removed.</p>
        <Link href="/admin/feature-requests" className="text-primary hover:underline">
          &larr; Back to Board
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-12">
      <Link href="/admin/feature-requests" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" />
        Back to Board
      </Link>

      <div className="glass glass-card p-6 sm:p-8 rounded-2xl border border-white/5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              {request.category && (
                <Badge variant="outline" className="text-xs uppercase tracking-wider font-medium bg-primary/5 text-primary border-primary/20">
                  {request.category}
                </Badge>
              )}
              <StatusBadge status={request.status} />
              
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto sm:ml-0">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}</span>
              </div>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-bold mb-4">{request.title}</h1>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-[10px]">
                {request.user?.name?.[0] || request.user?.email?.[0] || "?"}
              </div>
              <span>Suggested by <strong className="text-foreground">{request.user?.name || request.user?.email || "Unknown User"}</strong></span>
            </div>
          </div>
          
          <div className="shrink-0 flex flex-col items-stretch sm:items-end gap-2">
            <div className="flex flex-col items-center justify-center border border-primary/20 bg-primary/5 text-primary rounded-lg p-2 min-w-[64px]">
              <ChevronUp className="w-5 h-5 mb-1" />
              <span className="text-lg font-bold leading-none">{request._count.upvotes}</span>
            </div>
          </div>
        </div>

        <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none mb-8">
          <p className="whitespace-pre-wrap leading-relaxed">{request.description}</p>
        </div>

        {request.imageUrl && (
          <div className="mt-6 mb-8 rounded-xl overflow-hidden border bg-black/20">
            <a href={request.imageUrl} target="_blank" rel="noopener noreferrer">
              <Image 
                src={request.imageUrl} 
                alt="Feature request attachment" 
                width={800} 
                height={600} 
                className="w-full h-auto object-contain max-h-[500px]"
              />
            </a>
          </div>
        )}
        
        {request.mergedIntoId && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg text-sm mb-6 flex items-center gap-2">
            This request has been merged into another existing request.
            <Link href={`/feature-requests/${request.mergedIntoId}`} className="underline font-semibold hover:text-amber-400">
              View primary request &rarr;
            </Link>
          </div>
        )}

        {session.user.role === "SUPER_ADMIN" && (
          <AdminControls featureRequestId={request.id} currentStatus={request.status} />
        )}

      </div>

      <CommentsSection featureRequestId={request.id} comments={request.comments} />

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
    <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border uppercase tracking-wider ${colorClass}`}>
      {status}
    </span>
  );
}
