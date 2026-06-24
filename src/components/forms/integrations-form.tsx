"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { 
  updateOpenWaSettings, 
  getWhatsAppStatus, 
  disconnectWhatsApp, 
  restartWhatsAppSession,
  debugWhatsAppConnection,
} from "@/actions/integrations"
import { toast } from "sonner"
import { 
  MessageSquare, 
  Globe, 
  Key, 
  RefreshCcw,
  Smartphone,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  PowerOff,
  Phone,
  Loader2,
  Settings
} from "lucide-react"

interface IntegrationsFormProps {
  companyId: string
  initialEnabled: boolean
  initialUrl: string | null
  initialToken: string | null
  initialProvider?: string | null
}

type ConnectionState = "DISABLED" | "DOWN" | "STARTING" | "QR_READY" | "CONNECTED" | "FAILED"

export function IntegrationsForm({
  companyId,
  initialEnabled,
  initialUrl,
  initialToken,
  initialProvider,
}: IntegrationsFormProps) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [url, setUrl] = useState(initialUrl || "")
  const [token, setToken] = useState(initialToken || "")
  const [provider, setProvider] = useState(initialProvider || "openwa")
  const [showConfig, setShowConfig] = useState(!initialUrl)
  const [loading, setLoading] = useState(false)

  // WAHA session status states
  const [status, setStatus] = useState<ConnectionState>("DISABLED")
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [qrBase64, setQrBase64] = useState<string | null>(null)
  const [qrMimetype, setQrMimetype] = useState("image/png")
  const [phone, setPhone] = useState<string | null>(null)
  const [pushName, setPushName] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)
  // Track when STARTING began so we can detect a stuck session
  const [startingAt, setStartingAt] = useState<number | null>(null)
  const [startingSeconds, setStartingSeconds] = useState(0)

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchStatus = useCallback(async (silent = false) => {
    // Only poll OpenWA status when using the openwa provider
    const isOpenWa = !provider || provider === "openwa"
    if (!isOpenWa || !enabled || !url) {
      setStatus("DISABLED")
      return
    }
    if (!silent) {
      setStatusLoading(true)
    }
    try {
      const res = await getWhatsAppStatus()
      if (res.sessionId) {
        setSessionId(res.sessionId)
      }
      if (res.status === "DISABLED") {
        setStatus("DISABLED")
      } else if (res.status === "DOWN") {
        setStatus("DOWN")
        setStatusError(res.error || "Gateway server is unreachable.")
      } else if (res.status === "STARTING") {
        setStatus("STARTING")
        setQrBase64(null)
      } else if (res.status === "QR_READY") {
        setStatus("QR_READY")
        setQrBase64(res.qrBase64 || null)
        setQrMimetype(res.qrMimetype || "image/png")
      } else if (res.connected) {
        setStatus("CONNECTED")
        setPhone(res.phone || null)
        setPushName(res.pushName || null)
        setQrBase64(null)
      } else {
        setStatus("FAILED")
        setStatusError(res.error || "Session failed to start.")
      }
    } catch (e: any) {
      setStatus("DOWN")
      setStatusError(e.message || "Failed to fetch session status.")
    } finally {
      if (!silent) {
        setStatusLoading(false)
      }
    }
  }, [enabled, url, provider])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Track elapsed time in STARTING state
  useEffect(() => {
    if (status === "STARTING") {
      if (startingAt === null) setStartingAt(Date.now())
      const tick = setInterval(() => {
        setStartingSeconds(Math.floor((Date.now() - (startingAt ?? Date.now())) / 1000))
      }, 1000)
      return () => clearInterval(tick)
    } else {
      setStartingAt(null)
      setStartingSeconds(0)
    }
  }, [status, startingAt])

  // Establish WebSocket connection ONLY when using OpenWA provider
  useEffect(() => {
    const isOpenWa = !provider || provider === "openwa"
    if (!isOpenWa || !enabled || !url || !sessionId) {
      setWsConnected(false)
      return
    }

    // Convert http/https gateway url to ws/wss
    let wsUrl = url.replace(/\/$/, "")
    if (wsUrl.startsWith("http://")) {
      wsUrl = wsUrl.replace("http://", "ws://")
    } else if (wsUrl.startsWith("https://")) {
      wsUrl = wsUrl.replace("https://", "wss://")
    } else {
      wsUrl = `ws://${wsUrl}`
    }

    // Append Socket.IO endpoint parameters and apiKey query parameter for browser authentication
    const wsEndpoint = token
      ? `${wsUrl}/socket.io/?EIO=4&transport=websocket&apiKey=${encodeURIComponent(token)}`
      : `${wsUrl}/socket.io/?EIO=4&transport=websocket`

    let ws: WebSocket | null = null
    let reconnectTimeout: NodeJS.Timeout | null = null
    let isClosedIntentional = false

    function connect() {
      if (!enabled) return

      try {
        console.log(`Connecting to OpenWA Socket.IO WebSocket: ${wsEndpoint}`)
        ws = new WebSocket(wsEndpoint)

        ws.onopen = () => {
          console.log("OpenWA Socket.IO WebSocket transport opened.")
          isClosedIntentional = false
        }

        ws.onmessage = (event) => {
          try {
            const frame = event.data
            if (typeof frame !== "string") return

            // Engine.IO packet types:
            // 0: open (handshake)
            // 2: ping
            // 3: pong (usually sent by client in response to ping)
            // 4: message
            
            if (frame.startsWith("0")) {
              console.log("Engine.IO handshake received. Connecting to namespace...")
              ws?.send("40") // Connect to default namespace
            } else if (frame.startsWith("2")) {
              // Respond to ping with pong to keep connection alive
              ws?.send("3")
            } else if (frame.startsWith("40")) {
              console.log("Socket.IO default namespace connected. Subscribing to session events...")
              setWsConnected(true)

              // Send subscription frame in Socket.IO format: 42["message", payload]
              const subscribePayload = ["message", {
                type: "subscribe",
                payload: {
                  sessionId: sessionId,
                  events: ["session.status", "session.qr"]
                },
                requestId: `sub_${Date.now()}`
              }]
              ws?.send(`42${JSON.stringify(subscribePayload)}`)
            } else if (frame.startsWith("42")) {
              // Socket.IO message event: 42["eventName", payload]
              const content = frame.substring(2)
              const parsed = JSON.parse(content)
              
              if (Array.isArray(parsed) && parsed[0] === "message" && parsed[1]) {
                const msg = parsed[1]
                console.log("WebSocket event received:", msg)

                if (msg.type === "event" && msg.payload) {
                  const { event: eventName, sessionId: msgSessionId, data } = msg.payload

                  if (msgSessionId !== sessionId) return

                  if (eventName === "session.qr") {
                    const qrImage = data?.image || data?.qrCode || data?.code
                    if (qrImage) {
                      let base64 = qrImage
                      let mimetype = "image/png"

                      if (qrImage.startsWith("data:")) {
                        const parts = qrImage.split(",", 2)
                        mimetype = parts[0].replace("data:", "").replace(";base64", "")
                        base64 = parts[1]
                      }

                      setStatus("QR_READY")
                      setQrBase64(base64)
                      setQrMimetype(mimetype)
                    }
                  } else if (eventName === "session.status") {
                    const rawStatus = (data?.status || "UNKNOWN").toUpperCase()
                    
                    if (
                      rawStatus === "CREATED" ||
                      rawStatus === "STOPPED" ||
                      rawStatus === "FAILED" ||
                      rawStatus === "DISCONNECTED" ||
                      rawStatus === "INITIALIZING" ||
                      rawStatus === "CONNECTING" ||
                      rawStatus === "STARTING"
                    ) {
                      setStatus("STARTING")
                      setQrBase64(null)
                    } else if (rawStatus === "SCAN_QR" || rawStatus === "QR_READY") {
                      setStatus("QR_READY")
                    } else if (rawStatus === "CONNECTED" || rawStatus === "WORKING" || rawStatus === "READY") {
                      setStatus("CONNECTED")
                      setQrBase64(null)
                      
                      if (data?.phoneNumber || data?.phone) {
                        let phoneNum = data.phoneNumber || data.phone
                        if (phoneNum.includes("@")) {
                          phoneNum = phoneNum.split("@")[0]
                        }
                        setPhone(phoneNum)
                      }
                      if (data?.pushName) {
                        setPushName(data.pushName)
                      }
                    } else {
                      setStatus("FAILED")
                    }
                  }
                }
              }
            }
          } catch (err) {
            console.error("Failed to parse Socket.IO event frame:", err)
          }
        }

        ws.onerror = (err) => {
          // Browser WebSocket errors are opaque Event objects — log as warn, not error
          console.warn("OpenWA WebSocket connection error (gateway may be unreachable)")
        }

        ws.onclose = (event) => {
          console.log(`OpenWA WebSocket closed: Code=${event.code}, Reason=${event.reason}`)
          setWsConnected(false)

          if (!isClosedIntentional && enabled) {
            reconnectTimeout = setTimeout(() => {
              console.log("Reconnecting OpenWA WebSocket...")
              connect()
            }, 5000)
          }
        }
      } catch (err) {
        console.error("Failed to connect to OpenWA WebSocket:", err)
        setWsConnected(false)
      }
    }

    connect()

    return () => {
      isClosedIntentional = true
      if (ws) {
        ws.close()
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
    }
  }, [enabled, url, token, sessionId, provider])

  // HTTP polling fallback runs ONLY when in STARTING or QR_READY states AND WebSocket is NOT connected
  const shouldPoll = (status === "STARTING" || status === "QR_READY") && !wsConnected

  useEffect(() => {
    if (!shouldPoll) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      return
    }

    if (pollIntervalRef.current) return

    pollIntervalRef.current = setInterval(() => {
      fetchStatus(true)
    }, 4000)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [shouldPoll, fetchStatus])

  async function handleSaveSettings() {
    setLoading(true)
    try {
      if (enabled && !url) {
        toast.error("Please enter your OpenWA Gateway Server URL")
        setLoading(false)
        return
      }

      const res = await updateOpenWaSettings({
        enabled,
        url,
        token,
      })

      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("Settings saved successfully")
        setShowConfig(false)
        fetchStatus()
      }
    } catch {
      toast.error("Failed to save integration settings")
    } finally {
      setLoading(false)
    }
  }

  async function handleDisconnect() {
    if (loading) return
    setLoading(true)
    try {
      const res = await disconnectWhatsApp()
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("Session disconnected")
        setStatus("DISABLED")
        fetchStatus()
      }
    } catch {
      toast.error("Failed to disconnect session")
    } finally {
      setLoading(false)
    }
  }

  async function handleDebug() {
    const res = await debugWhatsAppConnection()
    console.log("[WhatsApp Debug]", JSON.stringify(res, null, 2))
    toast.info(
      `Debug info logged to console.\nHTTP: ${res.sessionsHttpStatus ?? "n/a"}\nToken: ${res.tokenPrefix ?? res.error}\nSessions: ${JSON.stringify(res.sessionsResponse)}`
    )
  }

  async function handleRefreshQr() {    if (loading) return
    setLoading(true)
    try {
      const res = await restartWhatsAppSession()
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("New QR code generation requested")
        setStatus("STARTING")
        fetchStatus()
      }
    } catch {
      toast.error("Failed to refresh session QR")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="glass border-white/10 bg-white/2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            <span>WhatsApp Integration (OpenWA API)</span>
            {enabled && url && (
              <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                wsConnected 
                  ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20"
                  : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
              }`}>
                <span className={`w-1 h-1 rounded-full ${wsConnected ? "bg-indigo-400 animate-pulse" : "bg-amber-400 animate-pulse"}`} />
                {wsConnected ? "Live WebSocket" : "HTTP Polling"}
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Send invoice links, receipts, and payment reminders directly using your WhatsApp profile.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {enabled && url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfig(!showConfig)}
              className="text-xs h-8 border-white/10 hover:bg-white/8 gap-1.5"
            >
              <Settings className="w-3.5 h-3.5" />
              {showConfig ? "Hide Config" : "Edit Config"}
            </Button>
          )}
          <Switch
            checked={enabled}
            onCheckedChange={(val) => {
              setEnabled(val)
              if (!val) setStatus("DISABLED")
            }}
            className="data-[state=checked]:bg-emerald-600"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Toggle details description when disabled */}
        {!enabled && (
          <div className="p-4 rounded-xl border border-white/5 bg-white/1 text-slate-400 text-xs leading-relaxed">
            WhatsApp messaging is currently disabled. Toggle the switch above to enable automatic dispatches and configure your custom OpenWA Gateway.
          </div>
        )}

        {enabled && (showConfig || !url) && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300 p-4 rounded-xl border border-white/5 bg-white/1">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Gateway Configuration</div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="openwa-url" className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-indigo-400" /> OpenWA Gateway Server URL
                </Label>
                <Input
                  id="openwa-url"
                  placeholder="e.g. http://192.168.1.100:2785"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="bg-white/2 border-white/10 text-slate-100 placeholder-slate-600 focus:border-indigo-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="openwa-token" className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-indigo-400" /> API Authorization Token (Optional)
                </Label>
                <Input
                  id="openwa-token"
                  type="password"
                  placeholder="Enter token if gateway requires an X-API-Key"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="bg-white/2 border-white/10 text-slate-100 placeholder-slate-600 focus:border-indigo-500/50"
                />
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <Button
                onClick={handleSaveSettings}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 h-8 font-semibold text-xs text-white"
              >
                {loading && <RefreshCcw className="w-3 animate-spin mr-1.5" />}
                Save settings
              </Button>
            </div>
          </div>
        )}

        {/* Live session connection cards */}
        {enabled && url && !showConfig && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {statusLoading && (
              <div className="flex flex-col items-center justify-center py-10 gap-3 border border-white/5 rounded-xl bg-white/1">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                <span className="text-xs text-slate-400">Loading session details...</span>
              </div>
            )}

            {!statusLoading && status === "DOWN" && (
              <div className="flex flex-col items-center justify-center p-6 border border-rose-500/10 bg-rose-500/5 rounded-xl text-center gap-3">
                <AlertTriangle className="w-10 h-10 text-rose-400" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">OpenWA Server Unreachable</h4>
                  <p className="text-xs text-rose-300 mt-1 max-w-sm">{statusError}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => fetchStatus()}
                  className="text-xs border-white/10 hover:bg-white/8 text-slate-200 mt-2 h-8"
                >
                  <RefreshCcw className="w-3.5 h-3.5 mr-1" /> Retry Connection
                </Button>
              </div>
            )}

            {!statusLoading && status === "FAILED" && (
              <div className="flex flex-col items-center justify-center p-6 border border-rose-500/10 bg-rose-500/5 rounded-xl text-center gap-3">
                <AlertTriangle className="w-10 h-10 text-rose-400" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">Session Connection Failed</h4>
                  <p className="text-xs text-rose-300 mt-1 max-w-sm">{statusError || "The WhatsApp session failed to start."}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => fetchStatus()}
                  className="text-xs border-white/10 hover:bg-white/8 text-slate-200 mt-2 h-8"
                >
                  <RefreshCcw className="w-3.5 h-3.5 mr-1" /> Retry Connection
                </Button>
              </div>
            )}

            {!statusLoading && status === "STARTING" && (
              <div className="flex flex-col items-center justify-center p-8 border border-white/5 bg-white/1 rounded-xl text-center gap-4">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">Initializing session...</h4>
                  <p className="text-xs text-slate-400 mt-1">OpenWA is starting the driver. QR code will appear in a moment.</p>
                  {startingSeconds > 0 && (
                    <p className="text-[10px] text-slate-500 mt-1">{startingSeconds}s elapsed</p>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest bg-white/2 border border-white/5 px-2 py-0.5 rounded">STARTING</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDebug}
                  className="text-xs h-8 border-white/10 text-slate-400 hover:bg-white/8"
                >
                  Run Diagnostics
                </Button>
                {startingSeconds >= 45 && (
                  <div className="flex flex-col items-center gap-2 mt-1 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 w-full">
                    <p className="text-xs text-amber-300">Session appears to be stuck. Try forcing a reset.</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshQr}
                        disabled={loading}
                        className="text-xs h-8 border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                      >
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCcw className="w-3.5 h-3.5 mr-1" />}
                        Force Reset
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDisconnect}
                        disabled={loading}
                        className="text-xs h-8 border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                      >
                        <PowerOff className="w-3.5 h-3.5 mr-1" />
                        Clear & Restart
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!statusLoading && status === "QR_READY" && qrBase64 && (
              <div className="flex flex-col md:flex-row items-center justify-center gap-6 p-6 border border-white/5 bg-white/1 rounded-xl">
                <div className="relative p-3 bg-white rounded-2xl shadow-lg border border-slate-200">
                  <img
                    src={`data:${qrMimetype};base64,${qrBase64}`}
                    alt="WhatsApp QR Code"
                    width={200}
                    height={200}
                    className="rounded-lg"
                  />
                  {loading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-2xl">
                      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-4 text-center md:text-left">
                  <div className="space-y-1.5">
                    <h4 className="text-base font-bold text-slate-100 flex items-center justify-center md:justify-start gap-1.5">
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                      Scan QR Code to Connect
                    </h4>
                    <ol className="list-decimal pl-4 text-xs text-slate-400 space-y-1 leading-normal text-left">
                      <li>Open **WhatsApp** on your mobile device.</li>
                      <li>Tap **Settings** or **Menu** ➔ **Linked Devices**.</li>
                      <li>Click **Link a Device** and point your camera here.</li>
                    </ol>
                  </div>

                  <div className="flex items-center justify-center md:justify-start gap-3">
                    <span className="text-[10px] text-amber-400 font-semibold bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" /> Awaiting phone scan...
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefreshQr}
                      disabled={loading}
                      className="text-xs border-white/10 hover:bg-white/8 h-8 text-slate-300"
                    >
                      <RefreshCcw className="w-3.5 h-3.5 mr-1" /> New QR
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {!statusLoading && status === "CONNECTED" && (
              <div className="flex flex-col md:flex-row items-center justify-between p-6 border border-emerald-500/10 bg-emerald-500/5 rounded-xl gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      WhatsApp Connected
                      <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                    </h4>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
                      {phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-500" /> +{phone}
                        </span>
                      )}
                      {pushName && (
                        <span className="flex items-center gap-1">
                          <Laptop className="w-3 h-3 text-slate-500" /> aka {pushName}
                        </span>
                      )}
                      <a
                        href="/settings/whatsapp-tester"
                        className="text-emerald-400 hover:text-emerald-300 font-semibold underline text-[11px] ml-1 flex items-center gap-1"
                      >
                        (Test Connection)
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <a
                    href="/settings/whatsapp-tester"
                    className="inline-flex items-center justify-center rounded-md text-xs border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 h-9 font-semibold px-3 transition-colors"
                  >
                    Message Tester
                  </a>
                  
                  <Button
                    variant="outline"
                    onClick={handleDisconnect}
                    disabled={loading}
                    className="text-xs border-white/10 hover:bg-white/8 hover:text-rose-400 h-9 font-semibold text-slate-300"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Disconnecting...
                      </>
                    ) : (
                      <>
                        <PowerOff className="w-3.5 h-3.5 mr-1.5" /> Disconnect account
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
