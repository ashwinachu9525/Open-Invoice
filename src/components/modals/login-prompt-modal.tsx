"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { LogIn } from "lucide-react"
import Link from "next/link"

interface LoginPromptModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reason?: string
}

export function LoginPromptModal({ open, onOpenChange, reason }: LoginPromptModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
              <LogIn className="w-5 h-5 text-slate-600" />
            </div>
            <DialogTitle className="text-2xl font-bold">Sign in Required</DialogTitle>
          </div>
          {reason && (
            <DialogDescription className="text-rose-600 font-medium">
              {reason}
            </DialogDescription>
          )}
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm text-slate-600">
            Create a free account to unlock higher daily limits, save your client details, and track invoice payments seamlessly.
          </p>
        </div>
        
        <div className="flex flex-col gap-2 mt-4">
          <Button onClick={() => window.location.href = '/login'} className="w-full">
            Log In to Continue
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/register'} className="w-full">
            Create Free Account
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
