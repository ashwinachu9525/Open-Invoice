"use server"

import { prisma } from "@/lib/prisma"

export async function dismissPasskeyPrompt(userId: string) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { passkeyPrompted: true }
    })
    return { success: true }
  } catch (e) {
    return { error: "Failed to dismiss prompt" }
  }
}

export async function setPasskeyEnabled(userId: string, enabled: boolean) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { passkeyEnabled: enabled, passkeyPrompted: true }
    })
    
    // If turning off passkeys, we should delete the existing authenticators
    // so that the user can re-register them if they turn it back on later.
    if (!enabled) {
      await prisma.authenticator.deleteMany({
        where: { userId: userId }
      })
    }
    
    return { success: true }
  } catch (e) {
    console.error(e)
    return { error: "Failed to update passkey status" }
  }
}
