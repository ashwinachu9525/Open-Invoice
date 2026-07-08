"use client";

import { Button } from "@/components/ui/button";
import { HeadphonesIcon } from "lucide-react";

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-background pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 rounded-xl bg-black p-6 sm:p-8 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-white/10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-white">
            <HeadphonesIcon className="h-6 w-6 text-green-400" />
            Support
          </h1>
          <p className="text-white/70 text-sm mt-1">
            Need help with something? We're here for you.
          </p>
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border/60 bg-card/50 py-24 text-center shadow-sm">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
            <HeadphonesIcon className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-semibold">Contact Support</h2>
          <p className="max-w-md text-base text-muted-foreground">
            Our team is available to assist you with any questions or issues you might have.
          </p>
          <Button size="lg" className="mt-4 rounded-xl px-8" onClick={() => window.open('mailto:support@open-invoice.com?subject=Support Request')}>
            Send us an Email
          </Button>
        </div>
      </main>
    </div>
  );
}
