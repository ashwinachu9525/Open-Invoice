import { CrmAiChat } from "@/components/crm/crm-ai-chat"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "CRM AI Copilot | Safe Natural Language Automation",
  description: "Ask questions, detect stalled deals, and generate automated workflows in plain English.",
}

export default function CrmAiPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            CRM AI Assistant
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Natural-language business operations with safe schema validation and confirmed execution.
          </p>
        </div>
      </div>

      <CrmAiChat />
    </div>
  )
}
