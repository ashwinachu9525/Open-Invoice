"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { generateMfaSecret, verifyAndEnableMfa, disableMfa } from "@/actions/mfa"
import { toast } from "sonner"
import Image from "next/image"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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

interface MfaSettingsFormProps {
  initialEnabled: boolean
}

export function MfaSettingsForm({ initialEnabled }: MfaSettingsFormProps) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [setupMode, setSetupMode] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [secret, setSecret] = useState("")
  const [token, setToken] = useState("")
  const [isPending, setIsPending] = useState(false)

  const handleSetup = async () => {
    setIsPending(true)
    const result = await generateMfaSecret()
    setIsPending(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    setQrCodeUrl(result.qrCodeDataUrl!)
    setSecret(result.secret!)
    setSetupMode(true)
  }

  const handleVerify = async () => {
    if (token.length !== 6) {
      toast.error("Please enter a 6-digit code")
      return
    }
    setIsPending(true)
    const result = await verifyAndEnableMfa(token)
    setIsPending(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("MFA has been successfully enabled!")
      setEnabled(true)
      setSetupMode(false)
    }
  }

  const handleDisable = async () => {
    setIsPending(true)
    const result = await disableMfa()
    setIsPending(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("MFA has been disabled.")
      setEnabled(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Authenticator App (TOTP)</h3>
          <p className="text-sm text-gray-500">
            Use an app like Google Authenticator or Authy to generate 2FA codes.
          </p>
        </div>
        {enabled ? (
          <AlertDialog>
            <AlertDialogTrigger render={
              <Button variant="destructive" disabled={isPending}>
                Disable
              </Button>
            } />
            <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-slate-100 font-semibold">Disable MFA?</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-400">
                  Are you sure you want to disable MFA? This will make your account less secure.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex gap-2 justify-end">
                <AlertDialogCancel className="border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDisable}
                  className="bg-rose-600 hover:bg-rose-700 text-slate-100"
                >
                  Disable MFA
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button onClick={handleSetup} disabled={isPending || setupMode}>
            Setup MFA
          </Button>
        )}
      </div>

      {setupMode && (
        <Alert className="mt-4 border-blue-500/20 bg-blue-500/5">
          <AlertTitle>Scan QR Code</AlertTitle>
          <AlertDescription className="space-y-4">
            <p>Scan this QR code with your authenticator app to add Open-Invoice.</p>
            {qrCodeUrl && (
              <div className="bg-white p-2 w-max rounded-md">
                <Image src={qrCodeUrl} alt="MFA QR Code" width={150} height={150} />
              </div>
            )}
            <p className="text-xs text-muted-foreground font-mono bg-black/5 p-2 rounded w-fit">
              Secret: {secret}
            </p>
            <div className="flex items-center gap-2 max-w-sm pt-2">
              <Input
                placeholder="Enter 6-digit code"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                maxLength={6}
              />
              <Button onClick={handleVerify} disabled={isPending || token.length !== 6}>
                Verify
              </Button>
              <Button variant="ghost" onClick={() => setSetupMode(false)}>
                Cancel
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
