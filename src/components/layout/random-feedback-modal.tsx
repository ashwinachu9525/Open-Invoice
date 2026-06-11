"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Star, MessageSquareHeart } from "lucide-react"

export function shouldTriggerFeedback(lastPromptDate: string | null, now: number, randomValue: number): boolean {
  const thirtyDays = 30 * 24 * 60 * 60 * 1000
  if (!lastPromptDate || now - parseInt(lastPromptDate, 10) > thirtyDays) {
    if (randomValue < 0.10) {
      return true
    }
  }
  return false
}

export function RandomFeedbackModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comments, setComments] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  useEffect(() => {
    const lastPrompt = localStorage.getItem("lastFeedbackPrompt")
    const now = Date.now()
    
    if (shouldTriggerFeedback(lastPrompt, now, Math.random())) {
      setIsOpen(true)
      localStorage.setItem("lastFeedbackPrompt", now.toString())
    }
  }, [])

  const handleSubmit = async () => {
    if (rating === 0) return

    setIsSubmitting(true)
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comments })
      })
      setIsSubmitted(true)
      setTimeout(() => setIsOpen(false), 2500)
    } catch (e) {
      console.error("Failed to submit feedback", e)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = () => {
    setIsOpen(false)
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[400px] bg-black/90 border-white/10 text-white backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareHeart className="h-5 w-5 text-pink-500" />
            Help us make it better!
          </DialogTitle>
          <DialogDescription>
            {isSubmitted ? "Thank you for your feedback!" : "How would you rate your experience with InvoiceAI so far?"}
          </DialogDescription>
        </DialogHeader>

        {!isSubmitted && (
          <div className="space-y-4 py-4 flex flex-col items-center">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="transition-transform hover:scale-110 focus:outline-none"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]"
                        : "text-muted-foreground"
                    } transition-colors`}
                  />
                </button>
              ))}
            </div>

            {rating > 0 && (
              <div className="w-full animate-in fade-in slide-in-from-top-2">
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-pink-500/50 resize-y"
                  placeholder="Any suggestions to make it more awesome?"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        {isSubmitted ? (
          <div className="py-6 flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-full bg-pink-500/20 flex items-center justify-center mb-3 text-pink-400">
              <MessageSquareHeart className="h-6 w-6" />
            </div>
            <p className="font-medium text-pink-400">Your feedback is captured.</p>
            <p className="text-sm text-muted-foreground">We appreciate your support!</p>
          </div>
        ) : (
          <DialogFooter className="sm:justify-between">
            <Button variant="ghost" onClick={handleSkip} className="hover:bg-white/10 text-muted-foreground">
              Maybe later
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={rating === 0 || isSubmitting}
              className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white"
            >
              {isSubmitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
