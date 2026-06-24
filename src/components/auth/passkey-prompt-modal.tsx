"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/webauthn"
import { ShieldCheck, Fingerprint } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { dismissPasskeyPrompt, setPasskeyEnabled } from "@/actions/passkey"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function PasskeyPromptModal({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const passkeyDismissedLocal = localStorage.getItem("passkey_dismissed")
    if (passkeyDismissedLocal !== "true") {
      setOpen(true)
    }
  }, [])

  const handleDismiss = async () => {
    setOpen(false)
    localStorage.setItem("passkey_dismissed", "true")
    await dismissPasskeyPrompt(userId)
    router.refresh()
  }

  const handleEnable = async () => {
    setLoading(true)
    try {
      const res = await signIn("passkey", { action: "register", redirect: false })
      
      if (res?.error) {
        toast.error("Failed to register passkey: " + res.error)
      } else {
        localStorage.setItem("passkey_dismissed", "true")
        await setPasskeyEnabled(userId, true)
        toast.success("Passkey registered successfully!")
        setOpen(false)
        router.refresh()
      }
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || String(e))
    }
    setLoading(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20 mb-4">
            <Fingerprint className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <AlertDialogTitle className="text-center text-xl">Enhance Your Security</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Sign in faster and more securely with Passkeys. Use your device's Face ID, Touch ID, or screen lock instead of a password.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center gap-2 sm:space-x-0">
          <Button variant="outline" onClick={handleDismiss} disabled={loading} className="w-full sm:w-auto">
            Maybe Later
          </Button>
          <Button onClick={handleEnable} disabled={loading} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <ShieldCheck className="h-4 w-4" />
            {loading ? "Registering..." : "Enable Passkeys"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
