"use client";

import { useState } from "react";
import { updateFeatureRequestStatus, mergeFeatureRequest } from "@/app/actions/feature-requests";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function AdminControls({ featureRequestId, currentStatus }: { featureRequestId: string, currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [isMerging, setIsMerging] = useState(false);

  async function handleStatusChange(newStatus: string | null) {
    if (!newStatus) return;
    setStatus(newStatus);
    setIsUpdatingStatus(true);
    try {
      await updateFeatureRequestStatus(featureRequestId, newStatus);
      toast.success("Status updated");
    } catch (e: any) {
      toast.error(e.message || "Failed to update status");
      setStatus(currentStatus);
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function handleMerge(e: React.FormEvent) {
    e.preventDefault();
    if (!mergeTargetId) return;
    
    setIsMerging(true);
    try {
      await mergeFeatureRequest(featureRequestId, mergeTargetId);
      toast.success("Request merged successfully");
    } catch (e: any) {
      toast.error(e.message || "Failed to merge request");
    } finally {
      setIsMerging(false);
    }
  }

  return (
    <div className="space-y-6 mt-8 p-6 rounded-xl border border-destructive/20 bg-destructive/5">
      <div>
        <h4 className="text-sm font-semibold text-destructive mb-4">Admin Controls</h4>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Change Status</label>
          <div className="flex items-center gap-2">
            <Select value={status} onValueChange={handleStatusChange} disabled={isUpdatingStatus}>
              <SelectTrigger className="w-[200px] bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="Under Review">Under Review</SelectItem>
                <SelectItem value="Planned">Planned</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Complete">Complete</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
                <SelectItem value="Acknowledged">Acknowledged</SelectItem>
              </SelectContent>
            </Select>
            {isUpdatingStatus && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-destructive/10">
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Merge Request</label>
          <p className="text-xs text-muted-foreground mb-2">Merge this request into another request by its ID. This request will be marked as Closed.</p>
          <form onSubmit={handleMerge} className="flex gap-2">
            <Input 
              placeholder="Target Request ID" 
              value={mergeTargetId} 
              onChange={e => setMergeTargetId(e.target.value)}
              className="bg-background max-w-[200px]"
            />
            <Button type="submit" variant="destructive" disabled={isMerging || !mergeTargetId}>
              {isMerging ? <Loader2 className="w-4 h-4 animate-spin" /> : "Merge"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
