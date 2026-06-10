import { getAISettings } from "@/actions/ai-settings"
import { AISettingsForm } from "@/components/forms/ai-settings-form"
import { Shield } from "lucide-react"

export default async function AISettingsPage() {
  const settings = await getAISettings()

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure AI providers, API keys, and fallback behavior for invoice generation and smart features.
        </p>
      </div>

      <div className="flex items-start gap-3 p-4 bg-primary/10 border border-primary/20 rounded-xl text-primary/90">
        <Shield className="h-5 w-5 shrink-0 mt-0.5 text-primary" />
        <div className="text-sm">
          <p className="font-semibold text-primary">Secure Storage</p>
          <p>
            Your API keys are encrypted at rest using AES-256-GCM. They are never exposed to the browser 
            and are decrypted only temporarily in memory when communicating with providers.
          </p>
        </div>
      </div>

      <AISettingsForm initialData={settings} />
    </div>
  )
}
