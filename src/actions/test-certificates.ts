"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export type TestParameter = {
  parameter: string
  result: string
  standard: string
}

export type CreateTestCertificateInput = {
  customerId: string
  invoiceId?: string
  certificateNumber: string
  date: string
  productName: string
  batchNumber?: string
  testedParameters: TestParameter[]
  remarks?: string
  authorizedSignatory?: string
}

export async function createTestCertificate(data: CreateTestCertificateInput) {
  const session = await auth()
  if (!session?.user?.companyId) {
    return { error: "Unauthorized" }
  }

  try {
    const certificate = await prisma.testCertificate.create({
      data: {
        companyId: session.user.companyId,
        customerId: data.customerId,
        invoiceId: data.invoiceId || null,
        certificateNumber: data.certificateNumber,
        date: new Date(data.date),
        productName: data.productName,
        batchNumber: data.batchNumber,
        testedParameters: data.testedParameters as any,
        remarks: data.remarks,
        authorizedSignatory: data.authorizedSignatory,
      },
    })
    
    revalidatePath("/certificates")
    if (data.invoiceId) {
      revalidatePath(`/invoices/${data.invoiceId}`)
    }
    
    return { success: true, certificate }
  } catch (error: any) {
    console.error("Failed to create test certificate:", error)
    return { error: "Failed to create test certificate." }
  }
}

export async function getTestCertificates() {
  const session = await auth()
  if (!session?.user?.companyId) {
    return { error: "Unauthorized" }
  }

  try {
    const certificates = await prisma.testCertificate.findMany({
      where: { companyId: session.user.companyId, deletedAt: null },
      include: {
        customer: { select: { name: true, companyName: true } },
        invoice: { select: { invoiceNumber: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, certificates }
  } catch (error) {
    return { error: "Failed to fetch test certificates." }
  }
}

export async function getTestCertificate(id: string) {
  const session = await auth()
  if (!session?.user?.companyId) {
    return { error: "Unauthorized" }
  }

  try {
    const certificate = await prisma.testCertificate.findUnique({
      where: { id, companyId: session.user.companyId },
      include: {
        customer: true,
        invoice: true,
        company: true
      }
    })
    if (!certificate) return { error: "Not found" }
    
    return { success: true, certificate }
  } catch (error) {
    return { error: "Failed to fetch test certificate." }
  }
}

export async function getPublicTestCertificate(id: string) {
  try {
    const certificate = await prisma.testCertificate.findUnique({
      where: { id, deletedAt: null },
      include: {
        customer: true,
        invoice: true,
        company: true
      }
    })
    if (!certificate) return { error: "Not found" }
    
    return { success: true, certificate }
  } catch (error) {
    return { error: "Failed to fetch test certificate." }
  }
}

export async function deleteTestCertificate(id: string) {
  const session = await auth()
  if (!session?.user?.companyId) {
    return { error: "Unauthorized" }
  }

  try {
    await prisma.testCertificate.update({
      where: { id, companyId: session.user.companyId },
      data: { deletedAt: new Date() },
    })
    revalidatePath("/certificates")
    return { success: true }
  } catch (error) {
    return { error: "Failed to delete test certificate." }
  }
}

export async function getNextCertificateNumber(): Promise<string> {
  const session = await auth()
  if (!session?.user?.companyId) {
    return `TC-${Date.now().toString().slice(-6)}`
  }

  try {
    const latest = await prisma.testCertificate.findFirst({
      where: { companyId: session.user.companyId },
      orderBy: { createdAt: "desc" },
      select: { certificateNumber: true },
    })

    if (!latest?.certificateNumber) {
      return "TC-001"
    }

    const match = latest.certificateNumber.match(/(\d+)$/)
    if (match) {
      const nextNum = parseInt(match[1], 10) + 1
      const prefix = latest.certificateNumber.replace(/(\d+)$/, "")
      return `${prefix}${String(nextNum).padStart(match[1].length, "0")}`
    }

    return `TC-${Date.now().toString().slice(-6)}`
  } catch {
    return `TC-${Date.now().toString().slice(-6)}`
  }
}

export async function getInvoicesForCertificate() {
  const session = await auth()
  if (!session?.user?.companyId) return []

  try {
    return await prisma.invoice.findMany({
      where: { companyId: session.user.companyId, deletedAt: null },
      select: {
        id: true,
        invoiceNumber: true,
        customerId: true,
        items: { select: { description: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    })
  } catch {
    return []
  }
}
