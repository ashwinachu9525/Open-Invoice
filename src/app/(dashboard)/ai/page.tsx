"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, Send, Plus, MessageSquare, Trash2, CheckCircle2, Download, Edit } from "lucide-react"
import { getChatSessions, getChatSession, createChatSession, addMessageToSession, deleteChatSession, appendToLastAssistantMessage } from "@/actions/ai-chat"
import { createInvoice, getNextInvoiceNumber } from "@/actions/invoice"
import { getCustomers } from "@/actions/customer"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { SendEmailButton } from "@/components/invoices/send-email-button"
import { UpgradeModal } from "@/components/modals/upgrade-modal"

interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
}

export default function AIChatPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<any[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isPending, setIsPending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Wizard States
  const [customers, setCustomers] = useState<any[]>([])
  const [draftState, setDraftState] = useState<{ clientId?: string, clientName?: string, details?: string }>({})

  // Upgrade Modal State
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState("")

  useEffect(() => {
    loadSessions()
    loadCustomers()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function loadCustomers() {
    const custs = await getCustomers({ limit: 1000 })
    setCustomers(custs.customers)
  }

  async function loadSessions() {
    const s = await getChatSessions()
    setSessions(s)
    if (s.length > 0 && !activeSessionId) {
      loadSession(s[0].id)
    } else if (s.length === 0) {
      handleNewChat()
    }
  }

  async function loadSession(id: string) {
    setActiveSessionId(id)
    setDraftState({})
    const session = await getChatSession(id)
    if (session) {
      setMessages(session.messages.map((m: any) => ({ role: m.role, content: m.content })))
    }
  }



  async function handleNewChat() {
    const s = await createChatSession("New Invoice Chat")
    
    if (s && "error" in s) {
      setUpgradeReason(s.error as string)
      setShowUpgrade(true)
      return
    }

    if (s && !("error" in s)) {
      setSessions([s as any, ...sessions])
      setActiveSessionId(s.id)
      setMessages([])
      setDraftState({})
    }
  }

  async function handleDeleteChat(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    await deleteChatSession(id)
    setSessions(sessions.filter(s => s.id !== id))
    if (activeSessionId === id) {
      setMessages([])
      setActiveSessionId(null)
      if (sessions.length > 1) {
        const nextId = sessions.find(s => s.id !== id)?.id
        if (nextId) loadSession(nextId)
      }
    }
  }

  function isQuestion(text: string) {
    const lower = text.trim().toLowerCase()
    return lower.endsWith("?") || lower.startsWith("what") || lower.startsWith("how") || lower.startsWith("why") || lower.startsWith("can you")
  }

  async function sendDirectMessage(text: string) {
    if (!activeSessionId || isPending) return
    await processMessage(text)
  }

  async function handleSend() {
    if (!input.trim() || !activeSessionId || isPending) return
    const userMsg = input.trim()
    setInput("")
    await processMessage(userMsg)
  }

  async function processMessage(userMsg: string) {
    // Check local wizard flow state
    const lastMsg = messages[messages.length - 1]
    
    if (lastMsg?.content === "PLEASE_ENTER_DETAILS") {
      setMessages(prev => [...prev, { role: "user", content: userMsg }])
      setDraftState(prev => ({ ...prev, details: userMsg }))
      
      setIsPending(true)
      const combinedPrompt = `I confirm these details for the invoice.
Client ID: ${draftState.clientId}
Details: ${userMsg}
Please generate the structured JSON payload for this invoice immediately. Do not ask for further details, assume default bank account and dates if omitted.`

      // Don't render combinedPrompt to UI, just send to backend
      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            sessionId: activeSessionId,
            messages: [...messages, { role: "user", content: combinedPrompt }] 
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Failed")
        
        const assistantMsg = data.message
        setMessages(prev => [...prev, { role: "assistant", content: assistantMsg }])
        await addMessageToSession(activeSessionId!, "assistant", assistantMsg)

      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to generate AI JSON")
      } finally {
        setIsPending(false)
      }
      return
    }

    setMessages(prev => [...prev, { role: "user", content: userMsg }])
    setIsPending(true)
    await addMessageToSession(activeSessionId!, "user", userMsg)

    // Intent Routing
    const lowerMsg = userMsg.toLowerCase()

    if (!isQuestion(userMsg) && (lowerMsg.includes("create") || lowerMsg.includes("invoice") || lowerMsg.includes("draft"))) {
      // Command: Start Wizard locally!
      setIsPending(false)
      
      // Simple extraction attempt
      let matchedClient = null
      for (const c of customers) {
        if (userMsg.toLowerCase().includes(c.name.toLowerCase()) || (c.companyName && userMsg.toLowerCase().includes(c.companyName.toLowerCase()))) {
          matchedClient = c
          break
        }
      }

      if (matchedClient) {
        setDraftState({ clientId: matchedClient.id, clientName: matchedClient.name || matchedClient.companyName })
        
        // If the user provided enough context in the initial prompt, skip asking for details!
        const lowerMsg = userMsg.toLowerCase()
        const hasDetails = userMsg.length > 50 || lowerMsg.includes('price') || lowerMsg.includes('rate') || lowerMsg.includes('description') || lowerMsg.includes('amount') || lowerMsg.includes('pricing') || lowerMsg.includes('gst')
        
        if (hasDetails) {
          // Immediately process it with LLM
          const combinedPrompt = `I confirm these details for the invoice.
Client ID: ${matchedClient.id}
Details: ${userMsg}
Please generate the structured JSON payload for this invoice immediately. Do not ask for further details, assume default bank account and dates if omitted.`
          
          setIsPending(true)
          try {
            const res = await fetch("/api/ai/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                sessionId: activeSessionId,
                messages: [...messages, { role: "user", content: combinedPrompt }] 
              }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? "Failed")
            
            const assistantMsg = data.message
            setMessages(prev => [...prev, { role: "assistant", content: assistantMsg }])
            await addMessageToSession(activeSessionId!, "assistant", assistantMsg)

          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to generate AI JSON")
          } finally {
            setIsPending(false)
          }
          return
        }

        setMessages(prev => [...prev, { role: "assistant", content: `I see you want to bill **${matchedClient.name || matchedClient.companyName}**.` }])
        setMessages(prev => [...prev, { role: "assistant", content: "PLEASE_ENTER_DETAILS" }])
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: "SELECT_CLIENT" }])
      }
      return
    }

    // Otherwise, hit backend LLM
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          sessionId: activeSessionId,
          messages: [...messages, { role: "user", content: userMsg }] 
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed")
      
      const assistantMsg = data.message
      setMessages(prev => [...prev, { role: "assistant", content: assistantMsg }])
      await addMessageToSession(activeSessionId!, "assistant", assistantMsg)

    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to get AI response")
    } finally {
      setIsPending(false)
    }
  }

  function selectClient(id: string, name: string) {
    setDraftState({ clientId: id, clientName: name })
    setMessages(prev => [...prev, { role: "assistant", content: `Selected client: **${name}**` }])
    setMessages(prev => [...prev, { role: "assistant", content: "PLEASE_ENTER_DETAILS" }])
  }

  async function handleGenerateInvoice(jsonString: string) {
    try {
      const data = JSON.parse(jsonString)
      const nextInvNumber = await getNextInvoiceNumber()
      
      const invoicePayload = {
        customerId: data.clientId,
        invoiceNumber: nextInvNumber,
        date: new Date(data.invoiceDate),
        dueDate: new Date(data.dueDate),
        currency: "INR",
        notes: "Generated by AI Assistant",
        items: [{
          description: data.description,
          hsnSac: data.hsnSac,
          quantity: data.quantity,
          unitPrice: data.rate,
          discount: 0,
          taxPercentage: data.gstPercent,
        }],
        tdsPercentage: 0,
        themeColor: data.themeColor || "#1e40af",
        themeFont: "Helvetica"
      }

      const res = await createInvoice(invoicePayload)
      if (res.error) throw new Error(res.error)
      
      // Update DB and Local State to prevent regenerating
      if (activeSessionId) {
        await appendToLastAssistantMessage(activeSessionId, `\n\n[GENERATED_INVOICE:${nextInvNumber}:${res.invoiceId}]`)
        // Find the last assistant message in local state and append
        setMessages(prev => {
          const newMessages = [...prev]
          for (let i = newMessages.length - 1; i >= 0; i--) {
            if (newMessages[i].role === "assistant") {
              newMessages[i] = { ...newMessages[i], content: newMessages[i].content + `\n\n[GENERATED_INVOICE:${nextInvNumber}:${res.invoiceId}]` }
              break
            }
          }
          return newMessages
        })
      }
      
      toast.success("Invoice generated successfully!")
      // DO NOT redirect, let the user stay in the chat to see the updated card
      // router.push("/invoices")
    } catch(e) {
      toast.error("Failed to parse or create invoice: " + (e instanceof Error ? e.message : "Unknown error"))
    }
  }

  function renderMessageContent(content: string) {
    if (content === "SELECT_CLIENT") {
      return (
        <div className="space-y-3 min-w-[250px]">
          <p className="font-medium text-blue-200">Please select a client from the list:</p>
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2">
            {customers.map(c => (
              <Button key={c.id} variant="secondary" size="sm" onClick={() => selectClient(c.id, c.name || c.companyName)} className="justify-start truncate">
                {c.name || c.companyName}
              </Button>
            ))}
            {customers.length === 0 && <p className="text-xs text-muted-foreground">No clients found. Please create one first.</p>}
          </div>
        </div>
      )
    }

    if (content === "PLEASE_ENTER_DETAILS") {
      return (
        <p className="font-medium text-blue-200">
          Please describe the invoice details below (services, rate, quantity, GST%, and dates).
        </p>
      )
    }

    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/)
    if (jsonMatch) {
      const before = content.substring(0, jsonMatch.index)
      const jsonStr = jsonMatch[1]
      
      const generatedMatch = content.match(/\[GENERATED_INVOICE:(.*?):(.*?)]/) || content.match(/\[GENERATED_INVOICE:(.*?)\]/)
      const isGenerated = !!generatedMatch
      const generatedInvNumber = generatedMatch ? generatedMatch[1] : ""
      const generatedInvId = generatedMatch && generatedMatch[2] ? generatedMatch[2] : ""
      
      return (
        <div className="space-y-4">
          <p className="whitespace-pre-wrap">{before}</p>
          <Card className={`border ${isGenerated ? 'bg-green-500/5 border-green-500/20' : 'bg-primary/5 border-primary/20'}`}>
            <CardContent className="p-5 flex flex-col gap-4">
              <div className={`flex items-center gap-2 font-semibold ${isGenerated ? 'text-green-500' : 'text-primary'}`}>
                <CheckCircle2 className="h-5 w-5" />
                {isGenerated ? 'Invoice Generated Successfully' : 'Invoice Ready for Generation'}
              </div>
              <p className="text-sm text-muted-foreground">
                {isGenerated 
                  ? `Invoice #${generatedInvNumber} has been created and saved to your database.`
                  : `The AI has constructed the final payload. Review the details above and click below to generate the actual invoice in your system.`
                }
              </p>
              {!isGenerated && (
                <Button onClick={() => handleGenerateInvoice(jsonStr)} className="w-full sm:w-auto self-start">
                  Generate Invoice Now
                </Button>
              )}
              {isGenerated && generatedInvId && (
                <div className="flex gap-2 flex-wrap mt-2">
                  <Link href={`/api/invoices/${generatedInvId}/pdf`} target="_blank">
                    <Button variant="outline" size="sm" className="glass border-white/10 hover:bg-white/8 gap-1.5">
                      <Download className="h-4 w-4" />
                      Download PDF
                    </Button>
                  </Link>
                  <SendEmailButton invoiceId={generatedInvId} />
                  <Link href={`/invoices/${generatedInvId}/edit`}>
                    <Button variant="outline" size="sm" className="glass border-white/10 hover:bg-white/8 gap-1.5">
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    // Strip out the generated token from normal text if it accidentally spills over
    const cleanContent = content.replace(/\[GENERATED_INVOICE:.*?\]/g, "")
    return <p className="whitespace-pre-wrap">{cleanContent}</p>
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100dvh-7rem)] md:h-[calc(100vh-8rem)] gap-4 md:gap-6">
      {/* Sidebar */}
      <div className="w-full md:w-64 flex-shrink-0 flex flex-col gap-4 bg-black/20 border border-white/10 rounded-xl p-4 overflow-hidden hidden md:flex">
        <Button onClick={handleNewChat} className="w-full justify-start gap-2" variant="outline">
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
        <div className="flex-1 overflow-y-auto space-y-2">
          {sessions.map(s => (
            <div 
              key={s.id} 
              onClick={() => loadSession(s.id)}
              className={`group flex items-center justify-between p-2 rounded-md cursor-pointer text-sm transition-colors ${activeSessionId === s.id ? 'bg-primary/20 text-primary' : 'hover:bg-white/5 text-muted-foreground'}`}
            >
              <div className="flex items-center gap-2 truncate">
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="truncate">{s.title}</span>
              </div>
              <button onClick={(e) => handleDeleteChat(s.id, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-black/20 border border-white/10 rounded-xl overflow-hidden relative min-h-[400px]">
        <div className="p-3 md:p-4 border-b border-white/10 bg-black/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-blue-500" />
            <h2 className="font-semibold text-base md:text-lg">AI Invoice Assistant</h2>
          </div>
          <Button onClick={handleNewChat} variant="ghost" size="sm" className="md:hidden h-8 px-2 text-xs">
            <Plus className="h-3 w-3 mr-1" /> New
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4">
              <Sparkles className="h-12 w-12 text-blue-500/50" />
              <p>Describe the invoice you want to create...</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'ml-auto' : ''}`}>
              {m.role === 'assistant' && (
                <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 border border-blue-500/30">
                  <Sparkles className="h-4 w-4 text-blue-400" />
                </div>
              )}
              <div className={`p-4 rounded-xl text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-white/5 border border-white/10 rounded-tl-sm'}`}>
                {renderMessageContent(m.content)}
              </div>
            </div>
          ))}
          {isPending && (
            <div className="flex gap-3 max-w-[85%]">
              <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 border border-blue-500/30">
                <Sparkles className="h-4 w-4 text-blue-400 animate-pulse" />
              </div>
              <div className="p-4 rounded-xl text-sm bg-white/5 border border-white/10 rounded-tl-sm flex items-center gap-2">
                <div className="h-2 w-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="h-2 w-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="h-2 w-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 md:p-4 bg-black/40 border-t border-white/10 flex flex-col gap-3 shrink-0">
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-full text-[10px] md:text-xs h-7 md:h-8 bg-white/5 border-white/10 hover:bg-white/10"
                onClick={() => sendDirectMessage("Hello")}
              >
                Say Hello
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-full text-[10px] md:text-xs h-7 md:h-8 bg-white/5 border-white/10 hover:bg-white/10"
                onClick={() => sendDirectMessage("Create a new invoice")}
              >
                Draft a new invoice
              </Button>
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
            <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="E.g., Create an invoice..."
              className="bg-black/50 border-white/20 h-10 md:h-12 text-base md:text-sm"
              disabled={isPending || !activeSessionId}
            />
            <Button type="submit" disabled={isPending || !activeSessionId || !input.trim()} className="h-10 w-10 md:h-12 md:w-12 shrink-0 p-0 rounded-xl">
              <Send className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
          </form>
        </div>
      </div>
      <UpgradeModal 
        open={showUpgrade} 
        onOpenChange={setShowUpgrade} 
        reason={upgradeReason} 
      />
    </div>
  )
}
