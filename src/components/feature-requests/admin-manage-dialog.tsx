"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AdminControls } from "./admin-controls";
import { Settings2 } from "lucide-react";

export function AdminManageDialog({ featureRequestId, currentStatus, title }: { featureRequestId: string, currentStatus: string, title: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger 
        render={
          <Button variant="outline" size="sm">
            <Settings2 className="mr-2 w-3 h-3" /> Manage
          </Button>
        } 
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="line-clamp-1">{title}</DialogTitle>
          <DialogDescription className="font-mono text-xs select-all">ID: {featureRequestId}</DialogDescription>
        </DialogHeader>
        <AdminControls featureRequestId={featureRequestId} currentStatus={currentStatus} />
      </DialogContent>
    </Dialog>
  );
}
