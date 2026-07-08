"use client";

import { Button } from "@/components/ui/button";
import { toggleUpvote } from "@/app/actions/feature-requests";
import { ChevronUp, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function UpvoteButton({ 
  featureRequestId, 
  initialUpvoted, 
  initialCount 
}: { 
  featureRequestId: string;
  initialUpvoted: boolean;
  initialCount: number;
}) {
  const [upvoted, setUpvoted] = useState(initialUpvoted);
  const [count, setCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);

  async function handleUpvote() {
    setIsLoading(true);
    try {
      const res = await toggleUpvote(featureRequestId);
      setUpvoted(res.upvoted);
      setCount(prev => res.upvoted ? prev + 1 : prev - 1);
    } catch (e: any) {
      toast.error(e.message || "Failed to upvote");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button 
      variant={upvoted ? "default" : "outline"} 
      className={`gap-2 ${upvoted ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
      onClick={handleUpvote}
      disabled={isLoading}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronUp className="w-4 h-4" />}
      {upvoted ? "Upvoted" : "Upvote"} ({count})
    </Button>
  );
}
