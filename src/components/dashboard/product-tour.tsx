"use client"

import { useEffect, useState } from "react"
import { driver } from "driver.js"
import "driver.js/dist/driver.css"
import { markTourCompleted } from "@/actions/user"
import { Sparkles, X } from "lucide-react"

export function ProductTour({ hasSeenTour }: { hasSeenTour: boolean }) {
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const tourSeenLocal = localStorage.getItem("tour_seen")
    if (tourSeenLocal === "true") return

    // Only show prompt if they haven't seen the tour yet
    if (hasSeenTour === false) {
      // Add a slight delay so it doesn't instantly pop up over loading states
      const timer = setTimeout(() => setShowPrompt(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [hasSeenTour])

  const handleSkip = async () => {
    setShowPrompt(false)
    localStorage.setItem("tour_seen", "true")
    await markTourCompleted()
  }

  const startTour = async () => {
    setShowPrompt(false)
    
    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: false,
      overlayColor: "rgba(0,0,0,0.7)",
      popoverClass: "glass-tour-popover", // Custom class for styling
      steps: [
        {
          element: '#tour-dashboard',
          popover: {
            title: 'Your Dashboard',
            description: 'Get a bird\'s eye view of your business. Track revenue, outstanding invoices, and recent activity here.',
            side: "right", align: 'start'
          }
        },
        {
          element: '#tour-invoices',
          popover: {
            title: 'Manage Invoices',
            description: 'Create, send, and track GST-compliant invoices. You can generate PDFs and email them directly to customers.',
            side: "right", align: 'start'
          }
        },
        {
          element: '#tour-customers',
          popover: {
            title: 'Customer Directory',
            description: 'Keep all your customer details in one place. Send account statements with a single click.',
            side: "right", align: 'start'
          }
        },
        {
          element: '#tour-ai-tools',
          popover: {
            title: '✨ AI Assistant',
            description: 'Supercharge your workflow! Use our AI tools to draft invoice descriptions, analyze spending, or auto-categorize your catalog items.',
            side: "right", align: 'start'
          }
        }
      ],
      onDestroyed: async () => {
        // Mark as completed when the tour finishes
        localStorage.setItem("tour_seen", "true")
        await markTourCompleted()
      }
    })
    
    driverObj.drive()
  }

  if (!showPrompt) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-sidebar/80 glass-sidebar backdrop-blur-2xl p-6 shadow-2xl">
        <button 
          onClick={handleSkip}
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/30">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        
        <h2 className="mb-2 text-xl font-bold text-foreground">Welcome to Open Invoice!</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          We're excited to have you here. Would you like a quick 1-minute tour to help you get started?
        </p>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleSkip}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-white/10 transition-colors"
          >
            Skip for now
          </button>
          <button
            onClick={startTour}
            className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-indigo-500 transition-all"
          >
            Take the Tour
          </button>
        </div>
      </div>
    </div>
  )
}
