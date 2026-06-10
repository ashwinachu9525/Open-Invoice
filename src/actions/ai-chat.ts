"use server"

import { prisma } from "@/lib/prisma"
import { requireCompany } from "@/lib/auth-helpers"
import { revalidatePath } from "next/cache"

export async function getChatSessions() {
  try {
    const { session, company } = await requireCompany()
    
    const chats = await prisma.aIChatSession.findMany({
      where: { companyId: company.id, userId: session.user.id },
      orderBy: { updatedAt: "desc" },
    })

    return chats
  } catch (error) {
    console.error("Failed to fetch chat sessions:", error)
    return []
  }
}

export async function getChatSession(id: string) {
  try {
    const { session, company } = await requireCompany()
    
    const chat = await prisma.aIChatSession.findFirst({
      where: { id, companyId: company.id, userId: session.user.id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    })

    return chat
  } catch (error) {
    console.error("Failed to fetch chat session:", error)
    return null
  }
}

export async function createChatSession(title: string) {
  try {
    const { session, company } = await requireCompany()
    
    const chat = await prisma.aIChatSession.create({
      data: {
        companyId: company.id,
        userId: session.user.id,
        title,
      },
    })

    revalidatePath("/ai")
    return chat
  } catch (error) {
    console.error("Failed to create chat session:", error)
    return null
  }
}

export async function addMessageToSession(sessionId: string, role: string, content: string) {
  try {
    const { session, company } = await requireCompany()
    
    // Verify ownership
    const chat = await prisma.aIChatSession.findFirst({
      where: { id: sessionId, companyId: company.id, userId: session.user.id },
    })

    if (!chat) throw new Error("Chat session not found")

    const message = await prisma.aIChatMessage.create({
      data: {
        sessionId,
        role,
        content,
      },
    })

    await prisma.aIChatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    })

    revalidatePath("/ai")
    return message
  } catch (error) {
    console.error("Failed to add message:", error)
    return null
  }
}

export async function deleteChatSession(id: string) {
  try {
    const { session, company } = await requireCompany()
    
    await prisma.aIChatSession.deleteMany({
      where: { id, companyId: company.id, userId: session.user.id },
    })

    revalidatePath("/ai")
    return { success: true }
  } catch (error) {
    console.error("Failed to delete chat session:", error)
    return { error: "Failed to delete chat" }
  }
}

export async function appendToLastAssistantMessage(sessionId: string, appendText: string) {
  try {
    const { session, company } = await requireCompany()
    
    // Find the last assistant message
    const lastMsg = await prisma.aIChatMessage.findFirst({
      where: { sessionId, role: "assistant" },
      orderBy: { createdAt: "desc" },
    })

    if (!lastMsg) throw new Error("No assistant message found")

    const updated = await prisma.aIChatMessage.update({
      where: { id: lastMsg.id },
      data: { content: lastMsg.content + "\n\n" + appendText },
    })

    revalidatePath("/ai")
    return updated
  } catch (error) {
    console.error("Failed to append to message:", error)
    return null
  }
}
