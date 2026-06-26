import { getApiKeys } from "@/actions/api-key"
import { getCustomDbSettings } from "@/actions/byodb"
import { DeveloperKeysForm } from "@/components/forms/developer-keys-form"
import { EmbedWidgetConfig } from "@/components/forms/embed-widget-config"
import { ByodbSettingsForm } from "@/components/forms/byodb-settings-form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Key, Code, ArrowLeft, Database } from "lucide-react"
import { requireCompany } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

export default async function DeveloperPortalPage() {
  const { company } = await requireCompany()
  
  const isPro = company.subscriptionTier === "PRO" || company.subscriptionTier === "ENTERPRISE"



  const [keysResult, customDbResult] = await Promise.all([
    getApiKeys(),
    getCustomDbSettings(),
  ])

  const { keys = [], error } = keysResult

  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-bold text-rose-500">Access Denied</h2>
        <p className="text-muted-foreground mt-2">{error}</p>
      </div>
    )
  }

  // Format keys data for frontend
  const formattedKeys = keys.map((k: any) => ({
    id: k.id,
    name: k.name,
    keyHint: k.keyHint,
    createdAt: k.createdAt,
    isActive: k.isActive,
  }))

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-end border-b border-white/5 pb-6">
        <div className="flex flex-col gap-2">
          <a
            href="/settings"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors w-fit"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to Settings
          </a>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <Code className="w-8 h-8 text-indigo-400" />
            Developer Portal
          </h1>
          <p className="text-slate-400 text-sm">
            Integrate Open Invoice with your external tools, create programmatic keys, or configure embeddable invoice widgets.
          </p>
        </div>
        <a
          href="/docs"
          target="_blank"
          className="inline-flex items-center justify-center rounded-md text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-indigo-600 hover:bg-indigo-500 text-white h-10 px-4.5 py-2 shadow-lg shadow-indigo-600/20 w-full sm:w-auto"
        >
          View API Docs (Swagger)
        </a>
      </div>

      <Tabs defaultValue="keys" className="w-full">
        <TabsList className="flex w-full overflow-x-auto justify-start bg-slate-900 border border-white/5 p-1 mb-6 no-scrollbar scrollbar-none flex-nowrap">
          <TabsTrigger value="keys" className="shrink-0 text-xs font-semibold px-4 py-2 flex items-center gap-1.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            <Key className="w-3.5 h-3.5" />
            API Credentials
          </TabsTrigger>
          <TabsTrigger value="embed" className="shrink-0 text-xs font-semibold px-4 py-2 flex items-center gap-1.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            <Code className="w-3.5 h-3.5" />
            Embeddable Iframe Widget
          </TabsTrigger>
          <TabsTrigger value="byodb" className="shrink-0 text-xs font-semibold px-4 py-2 flex items-center gap-1.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            <Database className="w-3.5 h-3.5" />
            Custom Database (BYODB)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="space-y-6 outline-none">
          <DeveloperKeysForm initialKeys={formattedKeys} isPro={isPro} />
        </TabsContent>
 
        <TabsContent value="embed" className="outline-none">
          <EmbedWidgetConfig apiKeys={formattedKeys} />
        </TabsContent>
 
        <TabsContent value="byodb" className="outline-none">
          <ByodbSettingsForm 
            initialUrl={customDbResult.url || null} 
            isConfigured={!!customDbResult.isConfigured} 
            isPro={isPro}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
