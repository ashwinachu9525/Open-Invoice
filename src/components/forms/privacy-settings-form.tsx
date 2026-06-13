"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Download, Trash2, AlertTriangle } from "lucide-react"

export function PrivacySettingsForm() {
  const router = useRouter()
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")

  const handleExportData = async () => {
    setIsExporting(true)
    try {
      const response = await fetch("/api/settings/export")
      if (!response.ok) throw new Error("Failed to export data")
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const contentDisposition = response.headers.get("Content-Disposition")
      let filename = "data-export.json"
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="([^"]+)"/)
        if (match) filename = match[1]
      }
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error(error)
      alert("Failed to export data. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE") return

    setIsDeleting(true)
    try {
      const response = await fetch("/api/settings/delete-account", {
        method: "POST",
      })
      if (!response.ok) throw new Error("Failed to delete account")
      
      // Sign out and redirect to home
      await signOut({ callbackUrl: "/" })
    } catch (error) {
      console.error(error)
      alert("Failed to schedule account deletion. Please try again.")
      setIsDeleting(false)
    }
  }

  return (
    <Card className="border-red-100 dark:border-red-900/50">
      <CardHeader>
        <CardTitle className="text-red-600 dark:text-red-400">Privacy & Data</CardTitle>
        <CardDescription>
          Manage your personal data. These actions are governed by GDPR and CCPA compliance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Export Data */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Download className="w-4 h-4 text-blue-600" /> 
              Export Data
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Download a JSON copy of all your personal data, invoices, and customers.
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleExportData} 
            disabled={isExporting}
          >
            {isExporting ? "Exporting..." : "Download JSON"}
          </Button>
        </div>

        {/* Delete Account */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-red-200 dark:border-red-900/50 rounded-lg bg-red-50 dark:bg-red-950/20">
          <div>
            <h3 className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> 
              Delete Account
            </h3>
            <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">
              Schedule your account for deletion. You will have 30 days to cancel this by logging back in.
            </p>
          </div>
          
          <Dialog>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-red-600 text-primary-foreground shadow-sm hover:bg-red-600/90 h-9 px-4 py-2">
              Delete Account
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-red-600">Are you absolutely sure?</DialogTitle>
                <DialogDescription>
                  This action will sign you out and schedule your account for permanent deletion.
                  If you do not log back in within <strong>30 days</strong>, your account, company profile, invoices, and all related data will be permanently wiped from our servers.
                </DialogDescription>
              </DialogHeader>
              
              <div className="my-4">
                <Label htmlFor="confirmation" className="text-sm font-semibold mb-2 block">
                  Please type <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-red-600">DELETE</span> to confirm.
                </Label>
                <Input 
                  id="confirmation" 
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="DELETE"
                />
              </div>

              <DialogFooter>
                <Button 
                  variant="destructive" 
                  disabled={deleteConfirmation !== "DELETE" || isDeleting}
                  onClick={handleDeleteAccount}
                  className="w-full sm:w-auto"
                >
                  {isDeleting ? "Scheduling Deletion..." : "Schedule Deletion"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

      </CardContent>
    </Card>
  )
}
