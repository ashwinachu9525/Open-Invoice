"use client"

import { useState, useEffect } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"
import { defaultShortcuts, UserShortcutConfig, ShortcutBinding } from "@/lib/shortcuts"
import { updateKeyboardShortcuts } from "@/actions/shortcuts"

interface KeyboardShortcutsFormProps {
  initialShortcuts?: UserShortcutConfig
}

export function KeyboardShortcutsForm({ initialShortcuts = {} }: KeyboardShortcutsFormProps) {
  const [search, setSearch] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [shortcuts, setShortcuts] = useState<UserShortcutConfig>(initialShortcuts)
  const [recordingId, setRecordingId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Group definitions
  const groupedDefs = defaultShortcuts.reduce((acc, def) => {
    if (!acc[def.group]) acc[def.group] = []
    acc[def.group].push(def)
    return acc
  }, {} as Record<string, typeof defaultShortcuts>)

  useEffect(() => {
    if (!recordingId) return

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()

      // Ignore just modifiers being pressed without a normal key
      if (["Alt", "Control", "Shift", "Meta"].includes(e.key)) {
        return
      }

      const newBinding: ShortcutBinding = {
        key: e.key,
        code: e.code,
        altKey: e.altKey,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        metaKey: e.metaKey
      }

      setShortcuts(prev => ({
        ...prev,
        [recordingId]: newBinding
      }))
      setRecordingId(null)
    }

    window.addEventListener("keydown", handleKeyDown, { capture: true })
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true })
  }, [recordingId])

  const handleSave = async () => {
    setIsSaving(true)
    const res = await updateKeyboardShortcuts(shortcuts)
    setIsSaving(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("Shortcuts updated successfully")
      setIsEditing(false)
    }
  }

  const renderKey = (label: string) => (
    <kbd className="inline-flex items-center justify-center rounded border border-white/20 bg-white/5 px-2 py-1 text-xs font-medium text-slate-300 shadow-sm mx-0.5 min-w-[24px]">
      {label}
    </kbd>
  )

  const getDisplayKey = (binding: ShortcutBinding) => {
    if (binding.code?.startsWith("Key")) return binding.code.replace("Key", "")
    if (binding.code?.startsWith("Digit")) return binding.code.replace("Digit", "")
    return binding.key.toUpperCase()
  }

  const renderBinding = (binding: ShortcutBinding) => {
    return (
      <div className="flex items-center flex-wrap">
        {binding.ctrlKey && renderKey("Ctrl")}
        {binding.altKey && renderKey("Alt / ⌥")}
        {binding.shiftKey && renderKey("Shift")}
        {binding.metaKey && renderKey("Cmd / Win")}
        {renderKey(getDisplayKey(binding))}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Customize keyboard shortcuts to match your workflow. 
            {isEditing ? " Click a row and press your desired key combination to rebind it." : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving..." : "Save changes"}</Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setIsEditing(true)}>Edit shortcuts</Button>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search a shortcut..." 
          className="pl-9 glass border-white/10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="glass border-white/10 overflow-hidden">
        <div className="divide-y divide-white/5">
          {Object.entries(groupedDefs).map(([group, defs]) => {
            const filteredDefs = defs.filter(def => 
              def.label.toLowerCase().includes(search.toLowerCase()) || 
              group.toLowerCase().includes(search.toLowerCase())
            )

            if (filteredDefs.length === 0) return null

            return (
              <div key={group} className="pb-2">
                <div className="px-4 py-3 bg-white/5 text-xs font-bold text-indigo-400 tracking-wider uppercase">
                  {group}
                </div>
                <div className="divide-y divide-white/5">
                  {filteredDefs.map(def => {
                    const currentBinding = shortcuts[def.id] || def.defaultBinding
                    const isRecording = recordingId === def.id

                    return (
                      <div 
                        key={def.id}
                        onClick={() => isEditing && setRecordingId(def.id)}
                        className={`
                          flex items-center justify-between px-4 py-3 
                          ${isEditing ? 'cursor-pointer hover:bg-white/5' : ''}
                          ${isRecording ? 'bg-indigo-500/20 ring-1 ring-inset ring-indigo-500/50' : ''}
                          transition-colors
                        `}
                      >
                        <div className="text-sm font-medium text-slate-200">
                          {def.label}
                        </div>
                        <div>
                          {isRecording ? (
                            <span className="text-xs text-indigo-300 animate-pulse">Press desired keys...</span>
                          ) : (
                            renderBinding(currentBinding)
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
