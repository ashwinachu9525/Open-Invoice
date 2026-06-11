"use server"

import { auth } from "@/auth"

type LlmProvider = "openai" | "gemini" | "nvidia"

export async function verifyLlmKey(provider: LlmProvider, key: string) {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" }
  }

  if (!key || key.trim() === "") {
    return { success: false, error: "API key is required." }
  }

  try {
    let response;

    switch (provider) {
      case "openai":
        // Check standard models endpoint
        response = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${key.trim()}` },
        })
        break

      case "gemini":
        // Check Gemini models endpoint
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key.trim()}`)
        break

      case "nvidia":
        // Check Nvidia NIM endpoints
        response = await fetch("https://integrate.api.nvidia.com/v1/models", {
          headers: { Authorization: `Bearer ${key.trim()}` },
        })
        break
        
      default:
        return { success: false, error: "Invalid provider selected." }
    }

    if (response.ok) {
      return { success: true, message: `Successfully connected to ${provider.toUpperCase()}. The key is valid and active.` }
    } else {
      const errorText = await response.text()
      console.error(`LLM verification failed for ${provider}:`, errorText)
      return { success: false, error: `Invalid key. Server responded with status: ${response.status}` }
    }
  } catch (error: any) {
    console.error(`LLM verification exception for ${provider}:`, error)
    return { success: false, error: `Connection failed: ${error.message}` }
  }
}
