import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/encryption"
import { GoogleGenerativeAI } from "@google/generative-ai"
import OpenAI from "openai"
import { AISettings } from "@prisma/client"

export interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export async function generateText({
  companyId,
  prompt,
}: {
  companyId: string
  prompt: string
}): Promise<string> {
  return generateChat({
    companyId,
    messages: [{ role: "user", content: prompt }]
  })
}

export async function generateChat({
  companyId,
  messages,
}: {
  companyId: string
  messages: ChatMessage[]
}): Promise<string> {
  const settings = await prisma.aISettings.findUnique({
    where: { companyId },
  })

  if (!settings) {
    throw new Error("AI settings not configured for this company")
  }

  const fallbackOrder = settings.fallbackOrder.split(",").map((s) => s.trim())
  if (fallbackOrder.length === 0) {
    throw new Error("No AI providers configured in fallback order")
  }

  for (const provider of fallbackOrder) {
    try {
      if (provider === "gemini") {
        if (!settings.geminiKey) throw new Error("Gemini key not configured")
        return await callGemini(messages, decrypt(settings.geminiKey, settings.companyId))
      } else if (provider === "openai") {
        if (!settings.openaiKey) throw new Error("OpenAI key not configured")
        return await callOpenAI(messages, decrypt(settings.openaiKey, settings.companyId))
      } else if (provider === "nvidia") {
        if (!settings.nvidiaKey) throw new Error("Nvidia key not configured")
        return await callNvidia(messages, decrypt(settings.nvidiaKey, settings.companyId))
      } else if (provider === "openrouter") {
        if (!settings.openrouterKey) throw new Error("Openrouter key not configured")
        return await callOpenRouter(messages, decrypt(settings.openrouterKey, settings.companyId))
      } else {
        console.warn(`Unknown AI provider: ${provider}`)
      }
    } catch (error) {
      console.warn(`Provider ${provider} failed:`, error instanceof Error ? error.message : String(error))
      // Continue to next provider
    }
  }

  throw new Error("All configured AI providers failed to generate a response.")
}

/**
 * Streaming variant — yields text chunks as they arrive.
 * Falls back to a single-chunk yield from the buffered generateChat if streaming
 * is not supported by the selected provider.
 */
export async function generateChatStream({
  companyId,
  messages,
  onChunk,
}: {
  companyId: string
  messages: ChatMessage[]
  onChunk: (chunk: string) => void
}): Promise<void> {
  const settings = await prisma.aISettings.findUnique({
    where: { companyId },
  })

  if (!settings) throw new Error("AI settings not configured for this company")

  const fallbackOrder = settings.fallbackOrder.split(",").map((s) => s.trim())
  if (fallbackOrder.length === 0) throw new Error("No AI providers configured")

  for (const provider of fallbackOrder) {
    try {
      if (provider === "gemini" && settings.geminiKey) {
        await streamGemini(messages, decrypt(settings.geminiKey, settings.companyId), onChunk)
        return
      } else if (provider === "openai" && settings.openaiKey) {
        await streamOpenAI(messages, decrypt(settings.openaiKey, settings.companyId), onChunk)
        return
      } else if (provider === "nvidia" && settings.nvidiaKey) {
        await streamOpenAICompat(
          messages,
          decrypt(settings.nvidiaKey, settings.companyId),
          "https://integrate.api.nvidia.com/v1",
          "meta/llama-3.1-70b-instruct",
          onChunk
        )
        return
      } else if (provider === "openrouter" && settings.openrouterKey) {
        await streamOpenAICompat(
          messages,
          decrypt(settings.openrouterKey, settings.companyId),
          "https://openrouter.ai/api/v1",
          "meta-llama/llama-3.1-8b-instruct:free",
          onChunk,
          {
            "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
            "X-Title": "Open Invoice",
          }
        )
        return
      }
    } catch (error) {
      console.warn(`[stream] Provider ${provider} failed:`, error instanceof Error ? error.message : String(error))
    }
  }

  // Final fallback: buffered generation → single chunk
  const result = await generateChat({ companyId, messages })
  onChunk(result)
}

// ── Provider implementations ──────────────────────────────────────────────

async function callGemini(messages: ChatMessage[], apiKey: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey)

  // Extract system message
  const systemMsg = messages.find(m => m.role === "system")?.content ?? ""
  const chatMessages = messages.filter(m => m.role !== "system")

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemMsg || undefined,
  })

  // Build Gemini history (all but last message)
  const history = chatMessages.slice(0, -1).map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }))

  const lastMessage = chatMessages[chatMessages.length - 1]?.content ?? ""

  const chat = model.startChat({ history })
  const result = await chat.sendMessage(lastMessage)
  const responseText = result.response.text()
  if (!responseText) throw new Error("Empty response from Gemini")
  return responseText
}

async function streamGemini(messages: ChatMessage[], apiKey: string, onChunk: (c: string) => void): Promise<void> {
  const genAI = new GoogleGenerativeAI(apiKey)

  const systemMsg = messages.find(m => m.role === "system")?.content ?? ""
  const chatMessages = messages.filter(m => m.role !== "system")

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemMsg || undefined,
  })

  const history = chatMessages.slice(0, -1).map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }))

  const lastMessage = chatMessages[chatMessages.length - 1]?.content ?? ""

  const chat = model.startChat({ history })
  const result = await chat.sendMessageStream(lastMessage)

  for await (const chunk of result.stream) {
    const text = chunk.text()
    if (text) onChunk(text)
  }
}

async function callOpenAI(messages: ChatMessage[], apiKey: string): Promise<string> {
  const openai = new OpenAI({ apiKey })
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: messages as any,
  })
  const responseText = response.choices[0]?.message?.content
  if (!responseText) throw new Error("Empty response from OpenAI")
  return responseText
}

async function streamOpenAI(messages: ChatMessage[], apiKey: string, onChunk: (c: string) => void): Promise<void> {
  const openai = new OpenAI({ apiKey })
  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: messages as any,
    stream: true,
  })
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content
    if (text) onChunk(text)
  }
}

async function callNvidia(messages: ChatMessage[], apiKey: string): Promise<string> {
  const openai = new OpenAI({
    baseURL: "https://integrate.api.nvidia.com/v1",
    apiKey,
  })
  const response = await openai.chat.completions.create({
    model: "meta/llama-3.1-70b-instruct",
    messages: messages as any,
  })
  const responseText = response.choices[0]?.message?.content
  if (!responseText) throw new Error("Empty response from Nvidia")
  return responseText
}

async function callOpenRouter(messages: ChatMessage[], apiKey: string): Promise<string> {
  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Open Invoice",
    }
  })
  const response = await openai.chat.completions.create({
    model: "meta-llama/llama-3.1-8b-instruct:free",
    messages: messages as any,
  })
  const responseText = response.choices[0]?.message?.content
  if (!responseText) throw new Error("Empty response from OpenRouter")
  return responseText
}

async function streamOpenAICompat(
  messages: ChatMessage[],
  apiKey: string,
  baseURL: string,
  model: string,
  onChunk: (c: string) => void,
  extraHeaders?: Record<string, string>
): Promise<void> {
  const openai = new OpenAI({ baseURL, apiKey, defaultHeaders: extraHeaders })
  const stream = await openai.chat.completions.create({
    model,
    messages: messages as any,
    stream: true,
  })
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content
    if (text) onChunk(text)
  }
}
