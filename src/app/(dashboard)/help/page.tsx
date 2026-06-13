"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ExternalLink,
  HelpCircle,
  Lightbulb,
  PlayCircle,
  Search,
  X,
  MessageCircle,
} from "lucide-react";
import {
  Badge,
} from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type HelpCategoryId = "getting_started" | "invoices" | "security" | "settings";

interface HelpCategory {
  id: HelpCategoryId;
  label: string;
}

interface HelpTopic {
  id: string;
  category: HelpCategoryId;
  title: string;
  summary: string;
  steps: string[];
  tips: string[];
  videoUrl?: string;
  links?: { href: string; label: string }[];
}

const HELP_CATEGORIES: HelpCategory[] = [
  { id: "getting_started", label: "Getting Started" },
  { id: "invoices", label: "Invoices & Quotations" },
  { id: "security", label: "Security & Authentication" },
  { id: "settings", label: "Settings & Team" },
];

const HELP_TOPICS: HelpTopic[] = [
  {
    id: "create_invoice",
    category: "invoices",
    title: "How to create your first Invoice",
    summary: "Learn the steps to generate and send a professional invoice to your clients.",
    steps: [
      "Navigate to the Invoices tab from the left sidebar.",
      "Click on the '+ Create Invoice' button at the top right.",
      "Select an existing customer or add a new one.",
      "Add line items from your Catalog or type them manually.",
      "Select the Bank Account where you'd like to receive payment.",
      "Click Save to generate the invoice."
    ],
    tips: [
      "You can use the 'AI Assist' button to automatically generate detailed descriptions for your items.",
      "Once saved, click 'Download PDF' to get a print-ready version."
    ],
  },
  {
    id: "setup_passkey",
    category: "security",
    title: "Setting up Passwordless Login (Passkeys)",
    summary: "Sign in faster and more securely using your device's fingerprint, FaceID, or PIN.",
    steps: [
      "Go to the Settings page from your dashboard.",
      "Scroll down to 'Security & Authentication'.",
      "Click the 'Setup Passkey' button.",
      "Follow your browser's prompt to register your device.",
      "Next time you log out, click 'Sign in with Passkey' on the login screen!"
    ],
    tips: [
      "Passkeys are tied to your device. If you use multiple devices, you can register a passkey on each one.",
      "Using a Passkey naturally bypasses the need for an Authenticator code (MFA)."
    ],
  },
  {
    id: "setup_mfa",
    category: "security",
    title: "Enabling Multi-Factor Authentication (MFA)",
    summary: "Add an extra layer of security using an Authenticator app like Google Authenticator or Authy.",
    steps: [
      "Navigate to the Settings page.",
      "Under 'Security & Authentication', click 'Setup MFA'.",
      "Open your preferred Authenticator app on your phone and scan the QR code.",
      "Enter the 6-digit code shown in your app to verify.",
      "Your account is now protected with TOTP!"
    ],
    tips: [
      "Make sure your phone's time is set to 'Automatic' for the codes to sync properly."
    ],
  },
  {
    id: "manage_team",
    category: "settings",
    title: "Inviting Team Members",
    summary: "Add your employees to the platform with role-based access control.",
    steps: [
      "Go to Settings and find the 'Team Management' section.",
      "Click 'Manage Team' to go to the Team portal.",
      "Enter the email address of the person you want to invite.",
      "Select their Role (ADMIN or STAFF).",
      "Click 'Invite'. They will receive an email with instructions to join."
    ],
    tips: [
      "STAFF members can create invoices but cannot view financial reports or change your bank details."
    ],
  },
  {
    id: "ai_assist",
    category: "settings",
    title: "Configuring AI Assist",
    summary: "Enable OpenAI, Gemini, or Nvidia models to speed up your workflow.",
    steps: [
      "Go to Settings and locate the 'AI Settings' card.",
      "Click 'Manage AI Settings'.",
      "Enter your API key for your preferred provider (e.g., OpenAI API Key).",
      "Select your default model.",
      "Save changes. The AI Assist buttons across the app will now be active."
    ],
    tips: [],
  }
];

type CategoryFilter = "ALL" | HelpCategoryId;

export default function HelpPage() {
  const [query, setQuery] = useState<string>("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryFilter>("ALL");

  const topicSearchIndex = useMemo(() => {
    const map = new Map<string, string>();
    for (const topic of HELP_TOPICS) {
      const parts = [topic.title, topic.summary, ...topic.steps, ...(topic.tips || [])];
      map.set(topic.id, parts.join(" ").toLowerCase());
    }
    return map;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return HELP_TOPICS.filter((topic) => {
      if (category !== "ALL" && topic.category !== category) return false;
      if (!q) return true;
      return (topicSearchIndex.get(topic.id) ?? "").includes(q);
    });
  }, [query, category, topicSearchIndex]);

  const grouped = useMemo(() => {
    const map = new Map<HelpCategoryId, HelpTopic[]>();
    for (const topic of filtered) {
      if (!map.has(topic.category)) map.set(topic.category, []);
      map.get(topic.category)!.push(topic);
    }
    return HELP_CATEGORIES.map((c) => ({
      ...c,
      topics: map.get(c.id) ?? [],
    })).filter((c) => c.topics.length > 0);
  }, [filtered]);

  return (
    <div className="min-h-screen bg-background pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Help Center</h1>
        <p className="text-muted-foreground mt-1">Find answers, learn how to use features, and get support.</p>
      </div>

      <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        
        {/* SIDEBAR / MOBILE STICKY HEADER */}
        <div className="sticky top-16 z-20 -mx-4 bg-background/80 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:w-72 lg:shrink-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none 2xl:w-80">
          <div className="flex flex-col gap-4 lg:sticky lg:top-24">
            
            {/* Search Input */}
            <div className="relative group">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search help articles..."
                className="h-12 rounded-2xl bg-muted/50 pl-10 pr-10 text-base shadow-sm backdrop-blur-sm transition-all focus:bg-background lg:h-11 lg:rounded-xl lg:text-sm"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="-mx-4 flex overflow-x-auto px-4 pb-2 pt-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:px-0 lg:flex-col lg:overflow-visible">
              <CategoryChip
                active={category === "ALL"}
                onClick={() => setCategory("ALL")}
              >
                All Topics ({HELP_TOPICS.length})
              </CategoryChip>
              {HELP_CATEGORIES.map((c) => {
                const count = HELP_TOPICS.filter((x) => x.category === c.id).length;
                if (count === 0) return null;
                return (
                  <CategoryChip
                    key={c.id}
                    active={category === c.id}
                    onClick={() => setCategory(c.id)}
                  >
                    {c.label} ({count})
                  </CategoryChip>
                );
              })}
            </div>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex w-full flex-1 flex-col gap-8 lg:min-w-0">
          
          {/* Empty State */}
          {grouped.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border/60 bg-card/50 py-20 text-center shadow-sm">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-muted">
                <HelpCircle className="h-7 w-7 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold">No results found</h2>
              <p className="max-w-sm text-sm text-muted-foreground">
                We couldn't find any articles matching your search query.
              </p>
              {query && (
                <Button variant="outline" className="mt-2 rounded-xl" onClick={() => setQuery("")}>
                  Clear Search
                </Button>
              )}
            </div>
          )}

          {/* Topic Groups */}
          {grouped.map((group) => (
            <section key={group.id} className="flex flex-col gap-4">
              <h2 className="px-1 text-sm font-bold tracking-tight text-foreground lg:text-base">
                {group.label}
              </h2>
              <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3">
                {group.topics.map((topic) => (
                  <TopicCard
                    key={topic.id}
                    topic={topic}
                    open={openId === topic.id}
                    onToggle={() =>
                      setOpenId((prev) => (prev === topic.id ? null : topic.id))
                    }
                  />
                ))}
              </div>
            </section>
          ))}

          {/* WhatsApp / Contact Floating Banner Card */}
          <div className="mt-4 rounded-3xl bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent p-1 sm:p-2">
            <Card className="border-none bg-transparent shadow-none">
              <CardContent className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between lg:p-6">
                <div className="flex items-center gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-green-500/20 text-green-600 dark:text-green-400">
                    <MessageCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold lg:text-lg">Still need help?</h3>
                    <p className="text-sm text-muted-foreground lg:text-base">Chat with our support team on WhatsApp.</p>
                  </div>
                </div>
                <a
                  href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NO || '1234567890'}?text=Hi%20OpenInvoice%20support`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full shrink-0 sm:w-auto"
                >
                  <Button className="w-full rounded-xl bg-green-500 text-base font-medium text-white shadow-lg shadow-green-500/20 transition-all hover:bg-green-400 hover:shadow-green-500/30 sm:w-auto sm:px-8 sm:py-6">
                    Contact Support
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "mr-2 shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 ease-in-out lg:mr-0 lg:w-full lg:rounded-xl lg:px-4 lg:py-3 lg:text-left",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-md lg:shadow-none"
          : "border-border/50 bg-card text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function TopicCard({
  topic,
  open,
  onToggle,
}: {
  topic: HelpTopic;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-300 sm:rounded-2xl",
        open ? "border-primary/30 shadow-md ring-1 ring-primary/10" : "border-border/50 shadow-sm hover:border-border hover:shadow-md"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-4 bg-card p-4 text-left transition-colors hover:bg-muted/30 sm:p-5"
      >
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base leading-snug sm:text-lg">{topic.title}</CardTitle>
          <CardDescription className="mt-1.5 line-clamp-2 text-sm leading-relaxed sm:text-base">
            {topic.summary}
          </CardDescription>
        </div>
        <div className="flex shrink-0 items-center gap-3 pt-1">
          {topic.videoUrl && (
            <Badge
              variant="outline"
              className="hidden shrink-0 gap-1.5 rounded-lg px-2.5 py-1 sm:inline-flex"
            >
              <PlayCircle className="h-3.5 w-3.5 text-primary" />
              <span>Video</span>
            </Badge>
          )}
          <div className={cn(
            "grid h-8 w-8 place-items-center rounded-full transition-colors",
            open ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}>
            <ChevronDown
              className={cn(
                "h-5 w-5 transition-transform duration-300",
                open && "-rotate-180"
              )}
            />
          </div>
        </div>
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <CardContent className="flex flex-col gap-6 bg-muted/10 p-4 pt-2 sm:p-5 sm:pt-2">
            
            {topic.videoUrl && (
              <div className="relative w-full overflow-hidden rounded-xl border border-border/50 bg-black shadow-inner">
                <div className="relative pt-[56.25%]">
                  <iframe
                    src={toEmbedUrl(topic.videoUrl)}
                    title={topic.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    className="absolute inset-0 h-full w-full"
                  />
                </div>
              </div>
            )}

            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">
                Steps
              </h3>
              <ol className="space-y-3">
                {topic.steps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm leading-relaxed text-foreground sm:text-base">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {idx + 1}
                    </span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {topic.tips && topic.tips.length > 0 && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 dark:border-amber-500/10 dark:bg-amber-500/10">
                <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  <Lightbulb className="h-4 w-4" />
                  Tips
                </div>
                <ul className="ml-1 space-y-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {topic.tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500/50" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {topic.links && topic.links.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {topic.links.map((l, idx) => (
                  <a
                    key={idx}
                    href={l.href}
                    target={l.href.startsWith("http") ? "_blank" : undefined}
                    rel={l.href.startsWith("http") ? "noreferrer" : undefined}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground shadow-sm transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary active:scale-95"
                  >
                    {l.label}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </div>
      </div>
    </Card>
  );
}

function toEmbedUrl(url: string): string {
  try {
    const u = new URL(url);

    if (u.hostname === "youtu.be") {
      const id = u.pathname.replace(/^\//, "");
      return id ? `https://www.youtube.com/embed/${id}` : url;
    }

    if (
      u.hostname === "youtube.com" ||
      u.hostname === "www.youtube.com" ||
      u.hostname === "m.youtube.com" ||
      u.hostname === "youtube-nocookie.com" ||
      u.hostname === "www.youtube-nocookie.com"
    ) {
      if (u.pathname.startsWith("/embed/")) return url;
      if (u.pathname === "/watch") {
        const id = u.searchParams.get("v");
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      if (u.pathname.startsWith("/shorts/")) {
        const id = u.pathname.replace("/shorts/", "").replace(/\/$/, "");
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      if (u.pathname.startsWith("/live/")) {
        const id = u.pathname.replace("/live/", "").replace(/\/$/, "");
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
    }

    if (u.hostname === "vimeo.com" || u.hostname === "www.vimeo.com") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      if (/^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }

    if (
      (u.hostname === "loom.com" || u.hostname === "www.loom.com") &&
      u.pathname.startsWith("/share/")
    ) {
      const id = u.pathname.replace("/share/", "").replace(/\/$/, "");
      if (id) return `https://www.loom.com/embed/${id}`;
    }

    return url;
  } catch {
    return url;
  }
}
