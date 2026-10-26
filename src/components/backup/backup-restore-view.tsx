"use client"

import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import {
  Download,
  Upload,
  Database,
  FileText,
  FileSpreadsheet,
  Award,
  Users,
  Package,
  Receipt,
  Settings,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Loader2,
  Clock,
  ArrowRight,
  HardDrive,
  CheckSquare,
  Square,
  Sparkles,
} from "lucide-react"
import {
  ALL_BACKUP_MODULES,
  BackupModule,
  MODULE_LABELS,
  RestorePreviewResult,
  RestoreStrategy,
  ServerBackupRecord,
} from "@/lib/backup/types"
import {
  createBackupAction,
  deleteBackupAction,
  executeRestoreAction,
  getBackupModuleStatsAction,
  listBackupsAction,
  previewRestoreAction,
} from "@/actions/backup-restore"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"

function getModuleIcon(mod: BackupModule) {
  switch (mod) {
    case "invoices":
      return FileText
    case "quotations":
      return FileSpreadsheet
    case "certificates":
      return Award
    case "customers":
      return Users
    case "catalog":
      return Package
    case "expenses":
      return Receipt
    case "settings":
      return Settings
    default:
      return Database
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

function triggerBrowserDownload(content: string, fileName: string) {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function BackupRestoreView() {
  const [subTab, setSubTab] = useState<"complete" | "module" | "restore" | "history">("complete")
  const [selectedModules, setSelectedModules] = useState<BackupModule[]>([...ALL_BACKUP_MODULES])
  const [isGenerating, setIsGenerating] = useState(false)
  const [moduleStats, setModuleStats] = useState<Record<BackupModule, number> | null>(null)

  // Backup History State
  const [serverBackups, setServerBackups] = useState<ServerBackupRecord[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Restore State
  const [restoreFileContent, setRestoreFileContent] = useState<string | null>(null)
  const [restoreFileName, setRestoreFileName] = useState<string | null>(null)
  const [restorePreview, setRestorePreview] = useState<RestorePreviewResult | null>(null)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [restoreModules, setRestoreModules] = useState<BackupModule[]>([])
  const [restoreStrategy, setRestoreStrategy] = useState<RestoreStrategy>("merge")
  const [isRestoring, setIsRestoring] = useState(false)
  const [restoreResult, setRestoreResult] = useState<any | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch module counts & history
  async function loadInitialData() {
    try {
      const statsRes = await getBackupModuleStatsAction()
      if (statsRes.success && statsRes.counts) {
        setModuleStats(statsRes.counts)
      }
    } catch (e) {
      console.error(e)
    }

    setLoadingHistory(true)
    try {
      const historyRes = await listBackupsAction()
      if (historyRes.success && historyRes.backups) {
        setServerBackups(historyRes.backups)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  // Toggle module selection
  function toggleModule(mod: BackupModule) {
    setSelectedModules((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    )
  }

  function selectAllModules() {
    setSelectedModules([...ALL_BACKUP_MODULES])
  }

  function deselectAllModules() {
    setSelectedModules([])
  }

  // Handle backup generation
  async function handleCreateBackup(modules: BackupModule[], isComplete: boolean) {
    if (modules.length === 0) {
      toast.error("Please select at least one module to back up.")
      return
    }

    setIsGenerating(true)
    try {
      const res = await createBackupAction(modules, true)
      if (!res.success || !res.payload) {
        throw new Error(res.error || "Backup generation failed")
      }

      const dateStr = new Date().toISOString().split("T")[0]
      const companySlug = (res.payload.metadata.companyName || "business")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_")
      const fileTypeTag = isComplete ? "complete" : "modular"
      const fileName = `${companySlug}_backup_${fileTypeTag}_${dateStr}.json`

      triggerBrowserDownload(JSON.stringify(res.payload, null, 2), fileName)
      toast.success(
        isComplete
          ? "Complete business backup downloaded & archived on server!"
          : `Module-wise backup (${modules.length} modules) downloaded successfully!`
      )

      // Refresh backup history
      const historyRes = await listBackupsAction()
      if (historyRes.success && historyRes.backups) {
        setServerBackups(historyRes.backups)
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate backup.")
    } finally {
      setIsGenerating(false)
    }
  }

  // Handle delete server backup
  async function handleDeleteBackup(id: string) {
    setDeletingId(id)
    try {
      const res = await deleteBackupAction(id)
      if (res.success) {
        setServerBackups((prev) => prev.filter((b) => b.id !== id))
        toast.success("Backup deleted from server.")
      } else {
        toast.error(res.error || "Failed to delete backup.")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete backup.")
    } finally {
      setDeletingId(null)
    }
  }

  // Handle file upload for restore
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setRestoreFileName(file.name)
    setRestoreResult(null)
    setRestorePreview(null)

    const reader = new FileReader()
    reader.onload = async (event) => {
      const text = event.target?.result as string
      setRestoreFileContent(text)
      setIsPreviewing(true)

      try {
        const previewRes = await previewRestoreAction(text)
        if (!previewRes.valid) {
          toast.error(previewRes.error || "Invalid backup file.")
          setRestorePreview(null)
        } else {
          setRestorePreview(previewRes)
          setRestoreModules(previewRes.metadata?.modules || [])
          toast.success("Backup validated! Review preview below before restoring.")
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to parse backup.")
      } finally {
        setIsPreviewing(false)
      }
    }
    reader.readAsText(file)
  }

  // Toggle restore module
  function toggleRestoreModule(mod: BackupModule) {
    setRestoreModules((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    )
  }

  // Execute restore
  async function handleExecuteRestore() {
    if (!restoreFileContent || restoreModules.length === 0) {
      toast.error("Please select at least one module to restore.")
      return
    }

    setIsRestoring(true)
    setRestoreResult(null)

    try {
      const res = await executeRestoreAction(
        restoreFileContent,
        restoreModules,
        restoreStrategy,
        true
      )
      setRestoreResult(res)

      if (res.success) {
        toast.success(res.message || "Data restored successfully!")
        loadInitialData()
      } else {
        toast.error(res.message || "Restore completed with some errors.")
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred during restore.")
    } finally {
      setIsRestoring(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border/40 pb-4">
        {[
          { id: "complete", label: "Complete Backup", icon: ShieldCheck, desc: "Full Business Archive" },
          { id: "module", label: "Module-Wise Backup", icon: Package, desc: "Selective Export" },
          { id: "restore", label: "Restore Data", icon: Upload, desc: "Import & Merge" },
          { id: "history", label: "Backup History", icon: Clock, desc: "Server Backups" },
        ].map((tab) => {
          const Icon = tab.icon
          const active = subTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => {
                setSubTab(tab.id as any)
                setRestoreResult(null)
              }}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── 1. COMPLETE BACKUP ────────────────────────────────────────────── */}
      {subTab === "complete" && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card/60 backdrop-blur border border-border/60 rounded-2xl p-6 space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    Complete Business Data Backup
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Export every record belonging to your business into a single cryptographically-verified
                    JSON bundle. All relations, line items, and settings are preserved.
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {ALL_BACKUP_MODULES.map((mod) => {
                  const Icon = getModuleIcon(mod)
                  const info = MODULE_LABELS[mod]
                  const count = moduleStats ? moduleStats[mod] : null
                  return (
                    <div
                      key={mod}
                      className="p-3.5 rounded-xl border border-border/50 bg-background/40 flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{info.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {count !== null ? `${count} records` : "Ready"}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  id="btn-complete-backup"
                  onClick={() => handleCreateBackup(ALL_BACKUP_MODULES, true)}
                  disabled={isGenerating}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Archiving Business Data...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Download Complete Backup (.json)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-card/40 border border-border/60 rounded-2xl p-5 space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Customer Data Isolation
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your backup includes only data registered under your authenticated business ID. Records,
                invoices, or customers from other tenants are never included or accessible.
              </p>
              <div className="pt-2 border-t border-border/30 text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Format:</span>
                  <span className="font-mono text-foreground">Open-Invoice v2.0 JSON</span>
                </div>
                <div className="flex justify-between">
                  <span>Integrity:</span>
                  <span className="font-mono text-emerald-400">SHA-256 Checksum</span>
                </div>
                <div className="flex justify-between">
                  <span>Server Archive:</span>
                  <span className="text-foreground">Stored in private vault</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. MODULE-WISE BACKUP ─────────────────────────────────────────── */}
      {subTab === "module" && (
        <div className="space-y-6">
          <div className="bg-card/60 backdrop-blur border border-border/60 rounded-2xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-400" />
                  Module-Wise Selective Backup
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose specific modules to back up. Dependencies (such as customers for invoices) are
                  automatically preserved.
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-center">
                <button
                  type="button"
                  onClick={selectAllModules}
                  className="px-3 py-1.5 rounded-lg border border-border/60 text-xs font-medium hover:bg-muted"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={deselectAllModules}
                  className="px-3 py-1.5 rounded-lg border border-border/60 text-xs font-medium hover:bg-muted"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {ALL_BACKUP_MODULES.map((mod) => {
                const Icon = getModuleIcon(mod)
                const info = MODULE_LABELS[mod]
                const isSelected = selectedModules.includes(mod)
                const count = moduleStats ? moduleStats[mod] : null

                return (
                  <div
                    key={mod}
                    onClick={() => toggleModule(mod)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                        : "border-border/60 bg-background/40 hover:border-border hover:bg-muted/20"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{info.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {count !== null ? `${count} records available` : "Active"}
                          </p>
                        </div>
                      </div>
                      <div>
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-primary" />
                        ) : (
                          <Square className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
                      {info.description}
                    </p>
                  </div>
                )
              })}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                id="btn-module-backup"
                onClick={() => handleCreateBackup(selectedModules, false)}
                disabled={isGenerating || selectedModules.length === 0}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Selected Backup...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download Selected ({selectedModules.length}) Modules
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. RESTORE DATA ──────────────────────────────────────────────── */}
      {subTab === "restore" && (
        <div className="space-y-6">
          {/* File Picker */}
          <div className="bg-card/60 backdrop-blur border border-border/60 rounded-2xl p-6 space-y-5">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Upload className="w-5 h-5 text-amber-500" />
                Restore Business Data from Backup
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Upload an Open-Invoice JSON backup file. You can choose to restore all or only specific
                modules, and decide whether to merge or skip conflicting records.
              </p>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border/80 hover:border-primary/60 rounded-2xl p-8 text-center cursor-pointer bg-background/30 hover:bg-muted/20 transition-all flex flex-col items-center justify-center gap-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {restoreFileName ? restoreFileName : "Click or drag your backup file here"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supported format: Verified Open-Invoice (.json) backup files
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Validation & Preview Card */}
          {isPreviewing && (
            <div className="p-8 text-center bg-card/60 rounded-2xl border border-border/60 flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <p className="text-sm font-medium">Validating file format and cryptographic integrity...</p>
            </div>
          )}

          {restorePreview && restorePreview.valid && (
            <div className="bg-card/60 backdrop-blur border border-border/60 rounded-2xl p-6 space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/40 gap-2">
                <div>
                  <h4 className="text-base font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    Backup Verification Passed
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Source: <strong className="text-foreground">{restorePreview.metadata?.companyName}</strong> (v
                    {restorePreview.metadata?.version}) &bull; Created:{" "}
                    {new Date(restorePreview.metadata?.createdAt || "").toLocaleString()}
                  </p>
                </div>
                <div className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  SHA-256 Verified
                </div>
              </div>

              {/* Module selection for restore */}
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">
                  Select Modules to Restore
                </Label>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {restorePreview.preview.map((p) => {
                    const Icon = getModuleIcon(p.module)
                    const isChecked = restoreModules.includes(p.module)
                    return (
                      <div
                        key={p.module}
                        onClick={() => toggleRestoreModule(p.module)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? "border-primary bg-primary/5"
                            : "border-border/60 bg-background/40 hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <Icon className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium capitalize">{p.module}</span>
                          </div>
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground flex justify-between">
                          <span>In Backup: {p.backupCount}</span>
                          <span className="text-emerald-400 font-medium">+{p.toInsert} new</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Restore Strategy Selection */}
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">
                  Conflict Resolution Strategy
                </Label>
                <div className="grid sm:grid-cols-3 gap-3">
                  {[
                    {
                      key: "merge",
                      label: "Merge & Update",
                      desc: "Update existing matching records and insert new ones (Recommended)",
                    },
                    {
                      key: "skip_existing",
                      label: "Skip Existing",
                      desc: "Only insert non-existing records; preserve existing without changes",
                    },
                    {
                      key: "clean_replace",
                      label: "Clean Replace",
                      desc: "Clear selected modules first, then insert backup records",
                    },
                  ].map((strat) => (
                    <div
                      key={strat.key}
                      onClick={() => setRestoreStrategy(strat.key as any)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        restoreStrategy === strat.key
                          ? "border-amber-500 bg-amber-500/10 shadow-sm shadow-amber-500/10"
                          : "border-border/60 bg-background/40 hover:bg-muted/20"
                      }`}
                    >
                      <p className="text-sm font-semibold">{strat.label}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-snug">{strat.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Restore Confirmation Trigger */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <AlertDialog>
                  <AlertDialogTrigger render={
                    <button
                      id="btn-confirm-restore"
                      disabled={isRestoring || restoreModules.length === 0}
                      className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-medium shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                    >
                      {isRestoring ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Restoring Data...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" />
                          Confirm &amp; Restore Data
                        </>
                      )}
                    </button>
                  } />
                  <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-slate-100 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500" /> Confirm Data Restoration
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-slate-400 space-y-2">
                        <p>
                          You are about to restore data for <strong>{restoreModules.join(", ")}</strong> using
                          strategy <strong>{restoreStrategy}</strong> into your business account.
                        </p>
                        <p className="text-xs text-slate-500">
                          A safety recovery snapshot will be automatically saved prior to applying changes.
                        </p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex gap-2 justify-end">
                      <AlertDialogCancel className="border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleExecuteRestore}
                        className="bg-amber-600 hover:bg-amber-500 text-slate-100"
                      >
                        Proceed with Restore
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}

          {/* Results Summary Card */}
          {restoreResult && (
            <div
              className={`p-6 rounded-2xl border ${
                restoreResult.success
                  ? "bg-emerald-500/10 border-emerald-500/20"
                  : "bg-rose-500/10 border-rose-500/20"
              } space-y-4`}
            >
              <div className="flex items-center gap-3">
                {restoreResult.success ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
                )}
                <div>
                  <h4 className="font-semibold text-base">
                    {restoreResult.success ? "Restoration Completed" : "Restoration Finished with Issues"}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{restoreResult.message}</p>
                </div>
              </div>

              {restoreResult.results && restoreResult.results.length > 0 && (
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                  {restoreResult.results.map((r: any) => (
                    <div
                      key={r.module}
                      className="p-3 rounded-xl bg-background/50 border border-border/40 text-xs space-y-1"
                    >
                      <p className="font-semibold capitalize text-foreground">{r.module}</p>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Inserted:</span>
                        <span className="text-emerald-400 font-mono">+{r.inserted}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Updated:</span>
                        <span className="text-amber-400 font-mono">{r.updated}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Skipped:</span>
                        <span className="font-mono">{r.skipped}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 4. BACKUP HISTORY ────────────────────────────────────────────── */}
      {subTab === "history" && (
        <div className="bg-card/60 backdrop-blur border border-border/60 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Server Backup History
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Archived copies of your backups safely stored under your isolated tenant directory.
              </p>
            </div>
            <button
              onClick={loadInitialData}
              disabled={loadingHistory}
              className="px-3 py-1.5 rounded-lg border border-border/60 text-xs font-medium hover:bg-muted flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {loadingHistory ? (
            <div className="py-12 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading archive records...
            </div>
          ) : serverBackups.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <HardDrive className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-medium text-muted-foreground">No server backups found yet.</p>
              <p className="text-xs text-muted-foreground">
                Generate a Complete or Module-Wise backup above to create an archive.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-xs text-muted-foreground">
                    <th className="pb-3 font-semibold">Backup File</th>
                    <th className="pb-3 font-semibold">Type</th>
                    <th className="pb-3 font-semibold">Modules</th>
                    <th className="pb-3 font-semibold">Size</th>
                    <th className="pb-3 font-semibold">Date &amp; Time</th>
                    <th className="pb-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {serverBackups.map((b) => (
                    <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 font-mono text-xs text-foreground max-w-[220px] truncate">
                        {b.fileName}
                      </td>
                      <td className="py-3.5">
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            b.backupType === "COMPLETE"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                          }`}
                        >
                          {b.backupType}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <div className="flex flex-wrap gap-1 max-w-[260px]">
                          {b.modules.map((m) => (
                            <span
                              key={m}
                              className="text-[10px] bg-muted/60 px-1.5 py-0.5 rounded text-muted-foreground"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 text-xs text-muted-foreground font-mono">
                        {formatBytes(b.fileSize)}
                      </td>
                      <td className="py-3.5 text-xs text-muted-foreground">
                        {new Date(b.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`/api/backup/download/${encodeURIComponent(b.fileName)}`}
                            download
                            className="p-1.5 rounded-lg border border-border/60 hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground"
                            title="Download backup"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <AlertDialog>
                            <AlertDialogTrigger render={
                              <button
                                disabled={deletingId === b.id}
                                className="p-1.5 rounded-lg border border-border/60 hover:bg-rose-500/10 hover:text-rose-400 transition-colors text-muted-foreground"
                                title="Delete backup"
                              >
                                {deletingId === b.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            } />
                            <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-slate-100 flex items-center gap-2">
                                  <Trash2 className="w-5 h-5 text-rose-500" /> Confirm Deletion
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-slate-400">
                                  Are you sure you want to permanently delete backup{" "}
                                  <code className="text-amber-400 font-mono">{b.fileName}</code> from the
                                  server vault? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="flex gap-2 justify-end">
                                <AlertDialogCancel className="border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteBackup(b.id)}
                                  className="bg-rose-600 hover:bg-rose-500 text-slate-100"
                                >
                                  Delete Backup
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
