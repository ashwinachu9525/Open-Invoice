"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Star, CheckCircle2, ArrowRight } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface UpsellModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  source: string
}

export function UpsellModal({ open, onOpenChange, source }: UpsellModalProps) {
  const [rating, setRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [comments, setComments] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [feedbackSent, setFeedbackSent] = useState(false)

  const submitFeedback = async () => {
    if (rating === 0) {
      toast.error("Please select a rating")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/public/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comments, source }),
      })

      if (!res.ok) throw new Error("Failed to submit")
      
      setFeedbackSent(true)
      toast.success("Thank you for your feedback!")
    } catch (e) {
      toast.error("Could not submit feedback")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto bg-green-500/10 text-green-500 p-3 rounded-full w-fit mb-4">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <DialogTitle className="text-2xl">Your document is ready 🎉</DialogTitle>
          <DialogDescription className="text-base pt-2">
            Your PDF has been successfully downloaded. 
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 p-4 rounded-xl mt-2 mb-4">
          <h3 className="font-semibold text-lg mb-2 text-foreground">Want to save your invoices?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create a free account to automatically save your invoices, manage your customers, and access our AI-powered features.
          </p>
          <div className="flex flex-col gap-2">
            <Link 
              href="/register" 
              className="inline-flex items-center justify-center w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl h-10 px-4 py-2"
            >
              Create Free Account <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
            <Button variant="outline" className="w-full rounded-xl" onClick={() => onOpenChange(false)}>
              Continue Free
            </Button>
          </div>
        </div>

        {!feedbackSent ? (
          <div className="text-center space-y-4 pb-2">
            <p className="text-sm font-medium">How was your experience?</p>
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 ${
                      (hoverRating || rating) >= star
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
            {(rating > 0 || hoverRating > 0) && (
              <div className="animate-in fade-in slide-in-from-top-2 space-y-3">
                <Textarea
                  placeholder="Tell us what you liked or how we can improve..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="min-h-[80px] text-sm resize-none"
                />
                <Button 
                  onClick={submitFeedback} 
                  disabled={submitting}
                  className="w-full rounded-xl"
                  variant="secondary"
                >
                  {submitting ? "Submitting..." : "Submit Feedback"}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-sm text-muted-foreground py-4">
            Thank you! Your feedback helps us improve.
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
