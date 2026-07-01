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

async function callGemini(messages: ChatMessage[], apiKey: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" })

  // Gemini expects history in a specific format
  const geminiHistory = messages.map(m => ({
    role: m.role === "assistant" ? "model" : m.role === "system" ? "user" : "user", // Map system to user for Gemini if it doesn't support system
    parts: [{ text: m.content }]
  }))

  // Actually, Gemini supports `systemInstruction` but it's simpler to just map system -> user or include it in the first prompt
  // But let's build the prompt carefully
  let promptText = ""
  for (const m of messages) {
    if (m.role === "system") promptText += `System: ${m.content}\n\n`
    else if (m.role === "user") promptText += `User: ${m.content}\n\n`
    else promptText += `Assistant: ${m.content}\n\n`
  }

  const result = await model.generateContent(promptText)
  const responseText = result.response.text()
  if (!responseText) throw new Error("Empty response from Gemini")
  return responseText
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
      "X-Title": "Invoice Generator",
    }
  })
  const response = await openai.chat.completions.create({
    model: "openrouter/free", // Or standard free models if preferred, maybe we can use claude-3.5-sonnet as a good default for OpenRouter
    messages: messages as any,
  })
  const responseText = response.choices[0]?.message?.content
  if (!responseText) throw new Error("Empty response from OpenRouter")
  return responseText
}
