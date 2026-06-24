"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { sendWhatsAppTestMessage } from "@/actions/integrations"
import { toast } from "sonner"
import {
  Loader2,
  Send,
  Terminal,
  CheckCircle2,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  User,
  Users,
  ArrowLeft
} from "lucide-react"

interface WhatsAppTesterFormProps {
  sessionName: string
  phoneNumber: string | null
  isConnected: boolean
}

type RecipientType = "personal" | "group"
type MessageType = "text" | "image" | "video" | "audio" | "document"

export function WhatsAppTesterForm({
  sessionName,
  phoneNumber,
  isConnected,
}: WhatsAppTesterFormProps) {
  const [recipientType, setRecipientType] = useState<RecipientType>("personal")
  const [recipient, setRecipient] = useState("")
  const [messageType, setMessageType] = useState<MessageType>("text")
  const [content, setContent] = useState("")
  const [caption, setCaption] = useState("")
  const [filename, setFilename] = useState("")
  const [sending, setSending] = useState(false)

  // API response state
  const [apiResponse, setApiResponse] = useState<any>(null)
  const [apiStatus, setApiStatus] = useState<number | null>(null)
  const [apiSuccess, setApiSuccess] = useState<boolean | null>(null)

  async function handleSendMessage() {
    if (!isConnected) {
      toast.error("Cannot send message: WhatsApp session is not connected")
      return
    }
    if (!recipient) {
      toast.error(
        recipientType === "personal"
          ? "Please enter a recipient phone number"
          : "Please enter a recipient group ID"
      )
      return
    }
    if (!content) {
      toast.error(messageType === "text" ? "Please enter message text" : "Please enter the media URL")
      return
    }

    setSending(true)
    setApiResponse(null)
    setApiStatus(null)
    setApiSuccess(null)

    try {
      const res = await sendWhatsAppTestMessage({
        recipientType,
        recipient,
        messageType,
        content,
        caption: (messageType === "image" || messageType === "video" || messageType === "document") ? caption : undefined,
        filename: messageType === "document" ? filename : undefined,
      })

      if (res.error) {
        toast.error(res.error)
        setApiResponse({ error: res.error })
        setApiSuccess(false)
        setApiStatus(500)
      } else {
        setApiStatus(201)
        setApiSuccess(!res.error)
        setApiResponse(res)

        if (!res.error) {
          toast.success("Test message sent successfully!")
        } else {
          toast.error(res.error || "Failed to send test message")
        }
      }
    } catch (err: any) {
      toast.error("An unexpected error occurred")
      setApiResponse({ error: err.message || "Unknown error" })
      setApiSuccess(false)
      setApiStatus(500)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl">
      {/* Header section with back navigation */}
      <div className="flex flex-col gap-2">
        <a
          href="/settings"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors w-fit"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to Settings
        </a>
        <h1 className="text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
          <Terminal className="w-8 h-8 text-emerald-400" />
          Message Tester
        </h1>
        <p className="text-slate-400 text-sm">
          Send test messages through the API
        </p>
      </div>

      {!isConnected && (
        <Card className="border border-amber-500/10 bg-amber-500/5 text-amber-200 p-6 rounded-xl">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">WhatsApp Session is Disconnected</h4>
              <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                To use the Message Tester, please return to the main settings page, verify your OpenWA Gateway URL and API Token, and scan the QR code to log into your WhatsApp account.
              </p>
              <a
                href="/settings"
                className="inline-flex items-center justify-center rounded-md text-xs border border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-100 mt-2 h-8 px-3 font-semibold transition-colors"
              >
                Configure WhatsApp Integration
              </a>
            </div>
          </div>
        </Card>
      )}

      {/* Dual Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        
        {/* Left Pane - Send Test Message Form */}
        <Card className="glass border-white/10 bg-white/2 overflow-hidden flex flex-col justify-between">
          <CardContent className="p-6 space-y-6">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Send Test Message
            </div>

            {/* Session Info */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-300">Session</Label>
              <Input
                readOnly
                value={
                  isConnected
                    ? `${sessionName}${phoneNumber ? ` (${phoneNumber})` : ""}`
                    : "No Active Session"
                }
                className="bg-white/2 border-white/10 text-slate-400 cursor-not-allowed text-xs h-10"
              />
            </div>

            {/* Recipient Type */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-300">Recipient Type</Label>
              <div className="grid grid-cols-2 gap-2 bg-white/2 p-1 rounded-lg border border-white/10">
                <button
                  type="button"
                  disabled={!isConnected}
                  onClick={() => setRecipientType("personal")}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold transition-all ${
                    !isConnected ? "opacity-50 cursor-not-allowed" : ""
                  } ${
                    recipientType === "personal"
                      ? "bg-emerald-500 text-white shadow-md font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  Personal
                </button>
                <button
                  type="button"
                  disabled={!isConnected}
                  onClick={() => setRecipientType("group")}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold transition-all ${
                    !isConnected ? "opacity-50 cursor-not-allowed" : ""
                  } ${
                    recipientType === "group"
                      ? "bg-emerald-500 text-white shadow-md font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Group
                </button>
              </div>
            </div>

            {/* Recipient Phone or Group ID */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-300">
                {recipientType === "personal" ? "Recipient Phone Number" : "Recipient Group JID / ID"}
              </Label>
              <Input
                disabled={!isConnected}
                placeholder={recipientType === "personal" ? "+62812345678" : "e.g. 120363xxx@g.us"}
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="bg-white/2 border-white/10 text-slate-100 placeholder-slate-600 text-xs h-10 focus:border-emerald-500/50"
              />
              {recipientType === "personal" && (
                <p className="text-[10px] text-slate-500 leading-normal">
                  Use international format without spaces
                </p>
              )}
            </div>

            {/* Message Type */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-300">Message Type</Label>
              <div className="flex flex-wrap gap-1.5 bg-white/2 p-1.5 rounded-lg border border-white/10">
                {(["text", "image", "video", "audio", "document"] as MessageType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    disabled={!isConnected}
                    onClick={() => {
                      setMessageType(type)
                      setContent("") // reset content on type switch
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-semibold capitalize flex items-center justify-center gap-1 transition-all ${
                      !isConnected ? "opacity-50 cursor-not-allowed" : ""
                    } ${
                      messageType === type
                        ? "bg-emerald-500 text-white shadow-md font-bold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {type === "text" && <FileText className="w-3 h-3" />}
                    {type === "image" && <ImageIcon className="w-3 h-3" />}
                    {type === "video" && <Video className="w-3 h-3" />}
                    {type === "audio" && <Music className="w-3 h-3" />}
                    {type === "document" && <FileText className="w-3 h-3" />}
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Content or Media URL */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-300">
                {messageType === "text" ? "Message Content" : `${messageType.toUpperCase()} URL`}
              </Label>
              {messageType === "text" ? (
                <Textarea
                  disabled={!isConnected}
                  placeholder="Enter your message here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="bg-white/2 border-white/10 text-slate-100 placeholder-slate-600 text-xs focus:border-emerald-500/50 min-h-[100px] resize-none"
                />
              ) : (
                <Input
                  disabled={!isConnected}
                  placeholder={`https://example.com/file.${messageType === "image" ? "jpg" : messageType === "video" ? "mp4" : messageType === "audio" ? "mp3" : "pdf"}`}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="bg-white/2 border-white/10 text-slate-100 placeholder-slate-600 text-xs h-10 focus:border-emerald-500/50"
                />
              )}
            </div>

            {/* Document Filename */}
            {messageType === "document" && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-300">Filename</Label>
                <Input
                  disabled={!isConnected}
                  placeholder="e.g. invoice.pdf"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  className="bg-white/2 border-white/10 text-slate-100 placeholder-slate-600 text-xs h-10 focus:border-emerald-500/50"
                />
              </div>
            )}

            {/* Caption for Media */}
            {(messageType === "image" || messageType === "video" || messageType === "document") && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-300">Caption (Optional)</Label>
                <Input
                  disabled={!isConnected}
                  placeholder="Enter custom caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="bg-white/2 border-white/10 text-slate-100 placeholder-slate-600 text-xs h-10 focus:border-emerald-500/50"
                />
              </div>
            )}

            <Button
              onClick={handleSendMessage}
              disabled={sending || !isConnected}
              className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 h-11 font-bold text-sm text-white flex items-center justify-center gap-2 mt-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending Message...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Message
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Right Pane - API Response */}
        <Card className="glass border-white/10 bg-white/2 flex flex-col min-h-[450px]">
          <CardContent className="p-6 flex flex-col h-full space-y-4">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>API Response</span>
              {apiStatus !== null && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                    apiSuccess
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  }`}
                >
                  {apiSuccess ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <AlertCircle className="w-3 h-3" />
                  )}
                  HTTP {apiStatus}
                </span>
              )}
            </div>

            <div className="flex-1 bg-slate-950/80 border border-white/5 rounded-xl p-4 font-mono text-[11px] leading-relaxed text-slate-300 overflow-auto max-h-[500px]">
              {apiResponse ? (
                <pre className="whitespace-pre-wrap">{JSON.stringify(apiResponse, null, 2)}</pre>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2 min-h-[350px]">
                  <Terminal className="w-8 h-8 opacity-40" />
                  <span>Send a message to see the API response</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
