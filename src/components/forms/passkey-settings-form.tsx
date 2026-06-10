"use client"

import { useState } from "react"
import { ShieldCheck, Fingerprint } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { setPasskeyEnabled } from "@/actions/passkey"
import { signIn } from "next-auth/webauthn"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface PasskeySettingsFormProps {
  userId: string
  initialEnabled: boolean
}

export function PasskeySettingsForm({ userId, initialEnabled }: PasskeySettingsFormProps) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleToggle = async (checked: boolean) => {
    setLoading(true)
    try {
      if (checked) {
        const res = await signIn("passkey", { action: "register", redirect: false })
        if (res?.error) {
          toast.error("Failed to register passkey: " + res.error)
          setEnabled(false)
        } else {
          await setPasskeyEnabled(userId, true)
          setEnabled(true)
          toast.success("Passkeys enabled successfully")
          router.refresh()
        }
      } else {
        await setPasskeyEnabled(userId, false)
        setEnabled(false)
        toast.success("Passkeys disabled")
        router.refresh()
      }
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || String(e))
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center justify-between border border-white/10 p-4 rounded-xl glass bg-background/50">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
          <Fingerprint className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <Label htmlFor="passkey-toggle" className="text-base font-semibold block mb-1">
            Passkey Login
          </Label>
          <p className="text-sm text-muted-foreground">
            Sign in securely using Face ID, Touch ID, or your device PIN.
          </p>
        </div>
      </div>
      <Switch 
        id="passkey-toggle" 
        checked={enabled} 
        onCheckedChange={handleToggle}
        disabled={loading}
      />
    </div>
  )
}
