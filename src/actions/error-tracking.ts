"use server"

import { prisma } from "@/lib/prisma"

export async function logAppError(errorData: {
  message: string
  digest?: string
  path?: string
}) {
  try {
    await prisma.appError.create({
      data: {
        message: errorData.message || "Unknown Application Error",
        digest: errorData.digest,
        path: errorData.path || "Unknown Path",
      }
    })
  } catch (e) {
    // Failsafe: if the database is down, we don't want the error logger to throw its own unhandled error
    console.error("Failed to log AppError to database:", e)
  }
}
