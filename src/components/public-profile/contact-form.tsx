"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { sendContactFormEmail } from "@/actions/profile"
import { toast } from "sonner"
import { Loader2, Send } from "lucide-react"

interface ContactFormProps {
  slug: string
}

export function ContactForm({ slug }: ContactFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !email || !message) {
      toast.error("Please fill all fields")
      return
    }

    setIsSubmitting(true)
    const result = await sendContactFormEmail(slug, { name, email, message })
    setIsSubmitting(false)

    if (result.success) {
      toast.success("Message sent successfully! We will get back to you soon.")
      setName("")
      setEmail("")
      setMessage("")
    } else {
      toast.error(result.error || "Failed to send message")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Your Name</label>
          <Input 
            placeholder="John Doe" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            required
            className="bg-white/5 border-white/10 text-white placeholder:text-slate-400 focus-visible:ring-indigo-500" 
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Your Email</label>
          <Input 
            type="email" 
            placeholder="john@example.com" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required
            className="bg-white/5 border-white/10 text-white placeholder:text-slate-400 focus-visible:ring-indigo-500" 
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Message</label>
        <Textarea 
          placeholder="How can we help you?" 
          value={message} 
          onChange={e => setMessage(e.target.value)} 
          required
          className="bg-white/5 border-white/10 text-white placeholder:text-slate-400 min-h-[120px] focus-visible:ring-indigo-500" 
        />
      </div>
      <Button 
        type="submit" 
        disabled={isSubmitting} 
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-lg shadow-indigo-500/20"
      >
        {isSubmitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Send className="mr-2 h-4 w-4" />
        )}
        Send Message
      </Button>
    </form>
  )
}
