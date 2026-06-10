"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Save, Trash, AlertCircle } from "lucide-react"
import { saveAISettings } from "@/actions/ai-settings"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"

const formSchema = z.object({
  provider: z.enum(["gemini", "openai", "nvidia", "openrouter"]),
  geminiKey: z.string().optional(),
  openaiKey: z.string().optional(),
  nvidiaKey: z.string().optional(),
  openrouterKey: z.string().optional(),
  fallbackOrder: z.array(z.enum(["gemini", "openai", "nvidia", "openrouter"])).min(1),
})

type FormValues = z.infer<typeof formSchema>

interface AISettingsFormProps {
  initialData: {
    provider: string
    fallbackOrder: string[]
    hasGeminiKey: boolean
    hasOpenAIKey: boolean
    hasNvidiaKey: boolean
    hasOpenrouterKey: boolean
  } | null
}

const PROVIDER_NAMES: Record<string, string> = {
  gemini: "Google Gemini",
  openai: "OpenAI",
  nvidia: "Nvidia NIM",
  openrouter: "OpenRouter",
}

function SortableItem({ id }: { id: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg mb-2">
      <button type="button" {...attributes} {...listeners} className="cursor-grab hover:text-primary transition-colors touch-none">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>
      <span className="font-medium text-sm">{PROVIDER_NAMES[id]}</span>
    </div>
  )
}

export function AISettingsForm({ initialData }: AISettingsFormProps) {
  const [isPending, setIsPending] = React.useState(false)
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      provider: (initialData?.provider as any) || "gemini",
      fallbackOrder: (initialData?.fallbackOrder as any) || ["gemini", "openai", "nvidia", "openrouter"],
      geminiKey: undefined,
      openaiKey: undefined,
      nvidiaKey: undefined,
      openrouterKey: undefined,
    },
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const fallbackOrder = form.watch("fallbackOrder")

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = fallbackOrder.indexOf(active.id as any)
      const newIndex = fallbackOrder.indexOf(over.id as any)
      form.setValue("fallbackOrder", arrayMove(fallbackOrder, oldIndex, newIndex), { shouldDirty: true })
    }
  }

  async function onSubmit(data: FormValues) {
    setIsPending(true)
    const res = await saveAISettings(data)
    setIsPending(false)

    if (res?.error) {
      toast.error(res.error)
    } else {
      toast.success("AI settings saved successfully")
      // Clear inputs since they are not loaded anyway
      form.setValue("geminiKey", undefined)
      form.setValue("openaiKey", undefined)
      form.setValue("nvidiaKey", undefined)
      form.setValue("openrouterKey", undefined)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Primary Provider */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Primary Provider</h3>
        <p className="text-sm text-muted-foreground">Select the default AI provider to handle your requests.</p>
        <RadioGroup
          value={form.watch("provider")}
          onValueChange={(val: any) => form.setValue("provider", val, { shouldDirty: true })}
          className="flex flex-col gap-3"
        >
          {["gemini", "openai", "nvidia", "openrouter"].map((p) => (
            <div key={p} className="flex items-center space-x-2 p-3 border border-white/10 rounded-lg hover:bg-white/5 cursor-pointer">
              <RadioGroupItem value={p} id={`provider-${p}`} />
              <Label htmlFor={`provider-${p}`} className="cursor-pointer font-medium">
                {PROVIDER_NAMES[p]}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Fallback Order */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Fallback Order</h3>
        <p className="text-sm text-muted-foreground">Drag to order providers. If the primary fails, the orchestrator will try the next available one.</p>
        
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={fallbackOrder} strategy={verticalListSortingStrategy}>
            <div>
              {fallbackOrder.map((id) => (
                <SortableItem key={id} id={id} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* API Keys */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">API Keys</h3>
        <p className="text-sm text-muted-foreground">Keys are encrypted with AES-256 before being stored in the database. Leave blank to keep existing keys.</p>

        <div className="space-y-4">
          {(["gemini", "openai", "nvidia", "openrouter"] as const).map((p) => {
            const hasKeyName = `has${p === 'gemini' ? 'Gemini' : p === 'openai' ? 'OpenAI' : p === 'nvidia' ? 'Nvidia' : 'Openrouter'}Key`
            const hasKey = initialData ? (initialData as any)[hasKeyName] : false
            const fieldName = `${p}Key` as const
            const val = form.watch(fieldName)

            return (
              <Card key={p} className="bg-transparent border-white/10">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 space-y-1">
                    <Label className="font-semibold">{PROVIDER_NAMES[p]}</Label>
                    <div className="flex items-center gap-2 text-xs">
                      {hasKey ? (
                        <span className="text-emerald-400 font-medium">Configured</span>
                      ) : (
                        <span className="text-amber-400 font-medium">Not Configured</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 relative">
                    <Input
                      type="password"
                      placeholder={hasKey ? "Enter new key to replace..." : "Enter API key..."}
                      value={val ?? ""}
                      onChange={(e) => form.setValue(fieldName, e.target.value, { shouldDirty: true })}
                      className="bg-black/20 pr-10"
                    />
                    {hasKey && (
                      <button
                        type="button"
                        onClick={() => {
                          form.setValue(fieldName, "", { shouldDirty: true })
                          toast.info(`Set ${PROVIDER_NAMES[p]} to be removed on save`)
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-red-400 p-1"
                        title="Remove Key"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Save */}
      <div className="pt-4 flex justify-end">
        <Button type="submit" disabled={isPending || !form.formState.isDirty} className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white min-w-[120px]">
          {isPending ? (
            <span className="animate-pulse">Saving...</span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Changes
            </span>
          )}
        </Button>
      </div>

    </form>
  )
}
