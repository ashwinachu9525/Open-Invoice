"use server"

import { prisma } from "@/lib/prisma"
import { getTenantDb } from "@/lib/tenant-db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { createAuditLog } from "@/services/audit"

async function requireUserAndTenant() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized: Please sign in.")
  }
  const companyId = session.user.companyId
  if (companyId) {
    const db = await getTenantDb(companyId)
    return {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        companyId,
      },
      companyId,
      db,
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { company: true }
  })
  if (!user?.companyId) {
    throw new Error("Unauthorized: User not associated with a company workspace.")
  }
  const db = await getTenantDb(user.companyId)
  return { user, companyId: user.companyId, db }
}

// ─────────────────────────────────────────────────────────────
// Default Stage Seeding
// ─────────────────────────────────────────────────────────────

export async function ensureDefaultStages(companyId: string, db: any) {
  const existingStages = await db.crmStage.findMany({
    where: { companyId },
    orderBy: { order: "asc" }
  })

  if (existingStages.length > 0) return existingStages

  const defaults = [
    { companyId, name: "Discovery", order: 1, probability: 20, color: "#3b82f6", isWon: false, isLost: false },
    { companyId, name: "Qualified", order: 2, probability: 40, color: "#8b5cf6", isWon: false, isLost: false },
    { companyId, name: "Proposal Sent", order: 3, probability: 60, color: "#eab308", isWon: false, isLost: false },
    { companyId, name: "Negotiation", order: 4, probability: 80, color: "#f97316", isWon: false, isLost: false },
    { companyId, name: "Closed Won", order: 5, probability: 100, color: "#10b981", isWon: true, isLost: false },
    { companyId, name: "Closed Lost", order: 6, probability: 0, color: "#ef4444", isWon: false, isLost: true },
  ]

  await db.crmStage.createMany({ data: defaults })
  return await db.crmStage.findMany({
    where: { companyId },
    orderBy: { order: "asc" }
  })
}

// ─────────────────────────────────────────────────────────────
// Pipeline & Deals
// ─────────────────────────────────────────────────────────────

export async function getCrmPipeline() {
  try {
    const { companyId, db } = await requireUserAndTenant()
    const stages = await ensureDefaultStages(companyId, db)

    const deals = await db.crmDeal.findMany({
      where: { companyId, deletedAt: null },
      include: {
        customer: { select: { id: true, name: true, companyName: true, email: true, phone: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        stage: true,
        activities: {
          where: { status: "PENDING" },
          orderBy: { dueDate: "asc" },
          take: 3
        }
      },
      orderBy: { createdAt: "desc" }
    })

    const pipelineStages = stages.map((stage: any) => {
      const stageDeals = deals.filter((d: any) => d.stageId === stage.id)
      const totalValue = stageDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0)
      const weightedValue = Math.round(totalValue * (stage.probability / 100))
      return {
        ...stage,
        deals: stageDeals,
        count: stageDeals.length,
        totalValue,
        weightedValue,
      }
    })

    return { success: true, stages: pipelineStages, totalDeals: deals.length }
  } catch (error: any) {
    console.error("getCrmPipeline error:", error)
    return { error: error.message || "Failed to load CRM pipeline." }
  }
}

export async function getDeals(filters?: { stageId?: string; status?: string; search?: string }) {
  try {
    const { companyId, db } = await requireUserAndTenant()
    const where: any = { companyId, deletedAt: null }

    if (filters?.stageId && filters.stageId !== "ALL") {
      where.stageId = filters.stageId
    }
    if (filters?.status && filters.status !== "ALL") {
      where.status = filters.status
    }
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { customer: { name: { contains: filters.search } } },
        { customer: { companyName: { contains: filters.search } } },
      ]
    }

    const deals = await db.crmDeal.findMany({
      where,
      include: {
        stage: true,
        customer: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 5
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return { success: true, deals }
  } catch (error: any) {
    console.error("getDeals error:", error)
    return { error: error.message || "Failed to fetch deals." }
  }
}

export async function createDeal(input: {
  title: string
  value: number
  currency?: string
  stageId?: string
  customerId?: string
  assignedToId?: string
  expectedCloseDate?: string | null
  probability?: number
  notes?: string
}) {
  try {
    const { user, companyId, db } = await requireUserAndTenant()
    let stageId = input.stageId

    if (!stageId) {
      const stages = await ensureDefaultStages(companyId, db)
      stageId = stages[0]?.id
    }

    const stage = await db.crmStage.findUnique({ where: { id: stageId } })
    const probability = input.probability ?? stage?.probability ?? 50
    const status = stage?.isWon ? "WON" : stage?.isLost ? "LOST" : "OPEN"

    const deal = await db.crmDeal.create({
      data: {
        companyId,
        title: input.title,
        value: Number(input.value) || 0,
        currency: input.currency || "INR",
        stageId: stageId!,
        stageName: stage?.name || "Discovery",
        customerId: input.customerId || null,
        assignedToId: input.assignedToId || user.id,
        expectedCloseDate: input.expectedCloseDate ? new Date(input.expectedCloseDate) : null,
        probability,
        status,
        notes: input.notes || null,
      },
      include: { stage: true, customer: true, assignedTo: true }
    })

    // Log activity
    await db.crmActivity.create({
      data: {
        companyId,
        type: "NOTE",
        title: `Deal Created: ${deal.title}`,
        description: `Deal created with initial value ₹${deal.value.toLocaleString("en-IN")} at stage ${deal.stageName}.`,
        status: "COMPLETED",
        dealId: deal.id,
        customerId: deal.customerId,
        assignedToId: user.id,
      }
    })

    // Trigger workflow evaluations
    await triggerWorkflowsForEvent("DEAL_CREATED", {
      companyId,
      entityType: "DEAL",
      entityId: deal.id,
      data: deal
    })

    revalidatePath("/crm/deals")
    revalidatePath("/crm/dashboard")
    return { success: true, deal }
  } catch (error: any) {
    console.error("createDeal error:", error)
    return { error: error.message || "Failed to create deal." }
  }
}

export async function updateDealStage(dealId: string, newStageId: string) {
  try {
    const { user, companyId, db } = await requireUserAndTenant()

    const stage = await db.crmStage.findUnique({ where: { id: newStageId } })
    if (!stage) return { error: "Stage not found." }

    const oldDeal = await db.crmDeal.findUnique({
      where: { id: dealId },
      include: { stage: true }
    })
    if (!oldDeal || oldDeal.companyId !== companyId) {
      return { error: "Deal not found." }
    }

    const newStatus = stage.isWon ? "WON" : stage.isLost ? "LOST" : "OPEN"

    const updated = await db.crmDeal.update({
      where: { id: dealId },
      data: {
        stageId: newStageId,
        stageName: stage.name,
        probability: stage.probability,
        status: newStatus,
      },
      include: { stage: true, customer: true, assignedTo: true }
    })

    // Log activity
    await db.crmActivity.create({
      data: {
        companyId,
        type: "NOTE",
        title: `Stage Changed: ${oldDeal.stage.name} ➔ ${stage.name}`,
        description: `Deal progressed to stage ${stage.name} (${stage.probability}% probability).`,
        status: "COMPLETED",
        dealId: dealId,
        customerId: updated.customerId,
        assignedToId: user.id,
      }
    })

    // Evaluate workflows
    await triggerWorkflowsForEvent("DEAL_STAGE_CHANGED", {
      companyId,
      entityType: "DEAL",
      entityId: dealId,
      data: updated
    })

    if (stage.isWon) {
      await triggerWorkflowsForEvent("DEAL_WON", {
        companyId,
        entityType: "DEAL",
        entityId: dealId,
        data: updated
      })
    }

    revalidatePath("/crm/deals")
    revalidatePath("/crm/dashboard")
    return { success: true, deal: updated }
  } catch (error: any) {
    console.error("updateDealStage error:", error)
    return { error: error.message || "Failed to update deal stage." }
  }
}

export async function deleteDeal(dealId: string) {
  try {
    const { companyId, db } = await requireUserAndTenant()
    await db.crmDeal.update({
      where: { id: dealId, companyId },
      data: { deletedAt: new Date() }
    })
    revalidatePath("/crm/deals")
    revalidatePath("/crm/dashboard")
    return { success: true }
  } catch (error: any) {
    return { error: error.message || "Failed to delete deal." }
  }
}

// ─────────────────────────────────────────────────────────────
// Leads Management
// ─────────────────────────────────────────────────────────────

export async function getLeads(filters?: { status?: string; search?: string; region?: string }) {
  try {
    const { companyId, db } = await requireUserAndTenant()
    const where: any = { companyId, deletedAt: null }

    if (filters?.status && filters.status !== "ALL") {
      where.status = filters.status
    }
    if (filters?.region && filters.region !== "ALL") {
      where.region = { contains: filters.region }
    }
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { companyName: { contains: filters.search } },
        { email: { contains: filters.search } },
        { phone: { contains: filters.search } },
        { region: { contains: filters.search } },
      ]
    }

    const leads = await db.crmLead.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        convertedCustomer: { select: { id: true, name: true, companyName: true } },
        convertedDeal: { select: { id: true, title: true, value: true, status: true } },
        activities: {
          where: { status: "PENDING" },
          orderBy: { dueDate: "asc" },
          take: 2
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return { success: true, leads }
  } catch (error: any) {
    console.error("getLeads error:", error)
    return { error: error.message || "Failed to load leads." }
  }
}

export async function createLead(input: {
  name: string
  companyName?: string
  email?: string
  phone?: string
  title?: string
  source?: string
  region?: string
  estimatedValue?: number
  score?: number
  notes?: string
  assignedToId?: string
}) {
  try {
    const { user, companyId, db } = await requireUserAndTenant()

    const lead = await db.crmLead.create({
      data: {
        companyId,
        name: input.name,
        companyName: input.companyName || null,
        email: input.email || null,
        phone: input.phone || null,
        title: input.title || null,
        source: input.source || "WEBSITE",
        status: "NEW",
        score: input.score ?? 20,
        region: input.region || null,
        estimatedValue: input.estimatedValue ? Number(input.estimatedValue) : null,
        notes: input.notes || null,
        assignedToId: input.assignedToId || user.id,
      },
      include: { assignedTo: true }
    })

    // Log initial activity
    await db.crmActivity.create({
      data: {
        companyId,
        type: "NOTE",
        title: `Lead Captured: ${lead.name}`,
        description: `Lead added from source: ${lead.source}${lead.region ? ` (Region: ${lead.region})` : ""}`,
        status: "COMPLETED",
        leadId: lead.id,
        assignedToId: user.id,
      }
    })

    // Execute automated workflows!
    await triggerWorkflowsForEvent("LEAD_CREATED", {
      companyId,
      entityType: "LEAD",
      entityId: lead.id,
      data: lead
    })

    revalidatePath("/crm/leads")
    revalidatePath("/crm/dashboard")
    return { success: true, lead }
  } catch (error: any) {
    console.error("createLead error:", error)
    return { error: error.message || "Failed to create lead." }
  }
}

export async function updateLead(id: string, data: any) {
  try {
    const { companyId, db } = await requireUserAndTenant()
    const oldLead = await db.crmLead.findUnique({ where: { id, companyId } })
    if (!oldLead) return { error: "Lead not found." }

    const updated = await db.crmLead.update({
      where: { id },
      data,
      include: { assignedTo: true }
    })

    if (data.status && data.status !== oldLead.status) {
      await triggerWorkflowsForEvent("LEAD_STATUS_CHANGED", {
        companyId,
        entityType: "LEAD",
        entityId: id,
        data: updated
      })
    }

    revalidatePath("/crm/leads")
    return { success: true, lead: updated }
  } catch (error: any) {
    return { error: error.message || "Failed to update lead." }
  }
}

export async function convertLead(leadId: string, options: {
  createDeal?: boolean
  dealTitle?: string
  dealValue?: number
  stageId?: string
}) {
  try {
    const { user, companyId, db } = await requireUserAndTenant()

    const lead = await db.crmLead.findUnique({
      where: { id: leadId, companyId }
    })
    if (!lead) return { error: "Lead not found." }

    // 1. Create or link Customer
    let customer = await db.customer.findFirst({
      where: {
        companyId,
        deletedAt: null,
        OR: [
          lead.email ? { email: lead.email } : {},
          lead.phone ? { phone: lead.phone } : {},
          { name: lead.name }
        ].filter(q => Object.keys(q).length > 0)
      }
    })

    if (!customer) {
      customer = await db.customer.create({
        data: {
          companyId,
          name: lead.name,
          companyName: lead.companyName || lead.name,
          email: lead.email,
          phone: lead.phone,
          state: lead.region || null,
          crmStatus: "ACTIVE",
        }
      })
    }

    // 2. Optionally create Deal
    let deal = null
    if (options.createDeal) {
      const stages = await ensureDefaultStages(companyId, db)
      const stageId = options.stageId || stages[1]?.id || stages[0]?.id
      const stage = stages.find((s: any) => s.id === stageId) || stages[0]

      deal = await db.crmDeal.create({
        data: {
          companyId,
          title: options.dealTitle || `Deal: ${lead.companyName || lead.name}`,
          value: Number(options.dealValue) || Number(lead.estimatedValue) || 10000,
          stageId: stage.id,
          stageName: stage.name,
          probability: stage.probability,
          customerId: customer.id,
          leadId: lead.id,
          assignedToId: lead.assignedToId || user.id,
          status: "OPEN",
          notes: `Converted from lead: ${lead.notes || "None"}`
        }
      })
    }

    // 3. Mark Lead as CONVERTED
    const updatedLead = await db.crmLead.update({
      where: { id: leadId },
      data: {
        status: "CONVERTED",
        convertedCustomerId: customer.id,
        convertedDealId: deal ? deal.id : null,
      }
    })

    // 4. Log interaction
    await db.customerInteraction.create({
      data: {
        customerId: customer.id,
        type: "NOTE",
        content: `Lead ${lead.name} successfully converted to Contact.${deal ? ` Associated Deal created: ${deal.title} (₹${deal.value})` : ""}`,
      }
    })

    revalidatePath("/crm/leads")
    revalidatePath("/crm/contacts")
    revalidatePath("/crm/deals")
    revalidatePath("/crm/dashboard")
    return { success: true, customer, deal, lead: updatedLead }
  } catch (error: any) {
    console.error("convertLead error:", error)
    return { error: error.message || "Failed to convert lead." }
  }
}

// ─────────────────────────────────────────────────────────────
// Contacts & Companies (Extends Customer records)
// ─────────────────────────────────────────────────────────────

export async function getCrmContacts(filters?: { search?: string; status?: string }) {
  try {
    const { companyId, db } = await requireUserAndTenant()
    const where: any = { companyId, deletedAt: null }

    if (filters?.status && filters.status !== "ALL") {
      where.crmStatus = filters.status
    }
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { companyName: { contains: filters.search } },
        { email: { contains: filters.search } },
        { phone: { contains: filters.search } },
        { gstin: { contains: filters.search } },
      ]
    }

    const contacts = await db.customer.findMany({
      where,
      include: {
        deals: {
          where: { deletedAt: null },
          select: { id: true, title: true, value: true, status: true, stageName: true }
        },
        crmActivities: {
          where: { status: "PENDING" },
          orderBy: { dueDate: "asc" },
          take: 3
        },
        invoices: {
          where: { deletedAt: null },
          select: { id: true, invoiceNumber: true, finalAmount: true, status: true }
        },
        interactions: {
          orderBy: { createdAt: "desc" },
          take: 3
        }
      },
      orderBy: { createdAt: "desc" }
    })

    const enriched = contacts.map((c: any) => {
      const totalDealsValue = c.deals.reduce((sum: number, d: any) => sum + (d.value || 0), 0)
      const wonDealsValue = c.deals.filter((d: any) => d.status === "WON").reduce((sum: number, d: any) => sum + (d.value || 0), 0)
      const totalInvoiced = c.invoices.reduce((sum: number, i: any) => sum + (i.finalAmount || 0), 0)
      return {
        ...c,
        totalDealsValue,
        wonDealsValue,
        totalInvoiced,
      }
    })

    return { success: true, contacts: enriched }
  } catch (error: any) {
    console.error("getCrmContacts error:", error)
    return { error: error.message || "Failed to load CRM contacts." }
  }
}

export async function createCrmContact(data: {
  name: string
  companyName?: string
  email?: string
  phone?: string
  address?: string
  state?: string
  gstin?: string
  crmStatus?: string
}) {
  try {
    const { companyId, db } = await requireUserAndTenant()
    const contact = await db.customer.create({
      data: {
        companyId,
        name: data.name,
        companyName: data.companyName || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        state: data.state || null,
        gstin: data.gstin || null,
        crmStatus: data.crmStatus || "ACTIVE",
      }
    })

    revalidatePath("/crm/contacts")
    revalidatePath("/customers")
    return { success: true, contact }
  } catch (error: any) {
    return { error: error.message || "Failed to create contact." }
  }
}

export async function addInteraction(customerId: string, type: string, content: string) {
  try {
    const { companyId, db } = await requireUserAndTenant()
    const customer = await db.customer.findFirst({
      where: { id: customerId, companyId, deletedAt: null },
    })

    if (!customer) return { error: "Customer not found" }

    const interaction = await db.customerInteraction.create({
      data: {
        customerId,
        type,
        content,
      },
    })

    revalidatePath(`/customers/${customerId}`)
    return { success: true, interaction }
  } catch (error: any) {
    console.error("Failed to add interaction:", error)
    return { error: error.message || "Failed to add interaction" }
  }
}

export async function getCustomerInteractions(customerId: string) {
  try {
    const { db } = await requireUserAndTenant()
    return await db.customerInteraction.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
    })
  } catch (error) {
    console.error("Failed to fetch customer interactions:", error)
    return []
  }
}

export async function updateCustomerCrmStatus(customerId: string, status: string) {
  try {
    const { companyId, db } = await requireUserAndTenant()
    const customer = await db.customer.findFirst({
      where: { id: customerId, companyId, deletedAt: null },
    })

    if (!customer) return { error: "Customer not found" }

    await db.customer.update({
      where: { id: customerId },
      data: { crmStatus: status },
    })

    await db.customerInteraction.create({
      data: {
        customerId,
        type: "NOTE",
        content: `Customer status updated to ${status.toUpperCase()}.`,
      },
    })

    revalidatePath(`/customers/${customerId}`)
    return { success: true }
  } catch (error: any) {
    console.error("Failed to update CRM status:", error)
    return { error: error.message || "Failed to update CRM status" }
  }
}

// ─────────────────────────────────────────────────────────────
// Activities (Calls, Emails, Meetings, Notes, Tasks)
// ─────────────────────────────────────────────────────────────

export async function getCrmActivities(filters?: { type?: string; status?: string; search?: string }) {
  try {
    const { companyId, db } = await requireUserAndTenant()
    const where: any = { companyId }

    if (filters?.type && filters.type !== "ALL") {
      where.type = filters.type
    }
    if (filters?.status && filters.status !== "ALL") {
      where.status = filters.status
    }
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { description: { contains: filters.search } },
      ]
    }

    const activities = await db.crmActivity.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        customer: { select: { id: true, name: true, companyName: true } },
        deal: { select: { id: true, title: true, value: true } },
        lead: { select: { id: true, name: true, companyName: true } },
      },
      orderBy: { createdAt: "desc" }
    })

    const normalized = activities.map((act: any, idx: number) => {
      let status = act.status
      if (status === "PENDING") status = "TODO"
      if (status === "COMPLETED") status = "DONE"
      return {
        ...act,
        status,
        jiraKey: act.jiraKey || `CRM-${activities.length - idx}`,
        priority: act.priority || "MEDIUM",
        comments: Array.isArray(act.comments) ? act.comments : [],
      }
    })

    return { success: true, activities: normalized }
  } catch (error: any) {
    console.error("getCrmActivities error:", error)
    return { error: error.message || "Failed to load activities." }
  }
}

export async function getCrmTeamMembers() {
  try {
    const { companyId, db } = await requireUserAndTenant()
    const members = await db.user.findMany({
      where: { companyId },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" }
    })
    return { success: true, members }
  } catch (error: any) {
    return { error: error.message || "Failed to load team members.", members: [] }
  }
}

export async function createCrmActivity(input: {
  type?: "CALL" | "EMAIL" | "MEETING" | "NOTE" | "TASK"
  title: string
  description?: string
  priority?: "HIGHEST" | "HIGH" | "MEDIUM" | "LOW" | "LOWEST"
  status?: "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "PENDING" | "COMPLETED"
  jiraKey?: string
  dueDate?: string | null
  assignedToId?: string
  customerId?: string
  dealId?: string
  leadId?: string
}) {
  try {
    const { user, companyId, db } = await requireUserAndTenant()
    const count = await db.crmActivity.count({ where: { companyId } })
    const jiraKey = input.jiraKey || `CRM-${count + 1}`
    const priority = input.priority || "MEDIUM"
    let status = input.status || (input.type === "NOTE" ? "DONE" : "TODO")
    if (status === "PENDING") status = "TODO"
    if (status === "COMPLETED") status = "DONE"

    const activity = await db.crmActivity.create({
      data: {
        companyId,
        type: input.type || "TASK",
        title: input.title,
        description: input.description || null,
        status,
        priority,
        jiraKey,
        comments: [],
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        assignedToId: input.assignedToId || user.id,
        customerId: input.customerId || null,
        dealId: input.dealId || null,
        leadId: input.leadId || null,
      },
      include: { assignedTo: true, customer: true, deal: true, lead: true }
    })

    revalidatePath("/crm/activities")
    revalidatePath("/crm/dashboard")
    return { success: true, activity }
  } catch (error: any) {
    console.error("createCrmActivity error:", error)
    return { error: error.message || "Failed to create activity." }
  }
}

export async function updateActivityDetails(id: string, data: {
  title?: string
  description?: string
  status?: string
  priority?: string
  dueDate?: string | null
  assignedToId?: string | null
}) {
  try {
    const { companyId, db } = await requireUserAndTenant()
    const updateData: any = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.status !== undefined) {
      updateData.status = data.status
      if (data.status === "DONE" || data.status === "COMPLETED") {
        updateData.completedAt = new Date()
      } else {
        updateData.completedAt = null
      }
    }
    if (data.priority !== undefined) updateData.priority = data.priority
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null
    if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId

    const updated = await db.crmActivity.update({
      where: { id, companyId },
      data: updateData,
      include: { assignedTo: true, customer: true, deal: true, lead: true }
    })
    revalidatePath("/crm/activities")
    revalidatePath("/crm/dashboard")
    return { success: true, activity: updated }
  } catch (error: any) {
    return { error: error.message || "Failed to update activity details." }
  }
}

export async function addActivityComment(activityId: string, input: {
  heading: string
  text: string
}) {
  try {
    const { user, companyId, db } = await requireUserAndTenant()
    const activity = await db.crmActivity.findUnique({
      where: { id: activityId, companyId }
    })
    if (!activity) return { error: "Activity not found" }

    const existingComments: any[] = Array.isArray(activity.comments) ? activity.comments : []
    const newComment = {
      id: "comm_" + Math.random().toString(36).substring(2, 9),
      heading: input.heading.trim() || "Status Update",
      text: input.text.trim(),
      authorId: user.id,
      authorName: user.name || user.email || "Team Member",
      authorEmail: user.email,
      createdAt: new Date().toISOString(),
    }

    const updated = await db.crmActivity.update({
      where: { id: activityId, companyId },
      data: {
        comments: [...existingComments, newComment]
      },
      include: { assignedTo: true, customer: true, deal: true, lead: true }
    })

    revalidatePath("/crm/activities")
    return { success: true, activity: updated, comment: newComment }
  } catch (error: any) {
    return { error: error.message || "Failed to add comment." }
  }
}

export async function updateActivityStatus(id: string, status: "PENDING" | "COMPLETED" | "CANCELLED") {
  try {
    const { companyId, db } = await requireUserAndTenant()
    const updated = await db.crmActivity.update({
      where: { id, companyId },
      data: {
        status,
        completedAt: status === "COMPLETED" ? new Date() : null,
      }
    })
    revalidatePath("/crm/activities")
    revalidatePath("/crm/dashboard")
    return { success: true, activity: updated }
  } catch (error: any) {
    return { error: error.message || "Failed to update activity status." }
  }
}

export async function deleteActivity(id: string) {
  try {
    const { companyId, db } = await requireUserAndTenant()
    await db.crmActivity.delete({ where: { id, companyId } })
    revalidatePath("/crm/activities")
    return { success: true }
  } catch (error: any) {
    return { error: error.message || "Failed to delete activity." }
  }
}

// ─────────────────────────────────────────────────────────────
// Campaigns
// ─────────────────────────────────────────────────────────────

export async function getCrmCampaigns() {
  try {
    const { companyId, db } = await requireUserAndTenant()
    const campaigns = await db.crmCampaign.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" }
    })
    return { success: true, campaigns }
  } catch (error: any) {
    return { error: error.message || "Failed to load campaigns." }
  }
}

export async function createCrmCampaign(input: {
  name: string
  type: string
  subject?: string
  content?: string
  targetAudience?: string
  scheduledAt?: string | null
}) {
  try {
    const { companyId, db } = await requireUserAndTenant()
    const campaign = await db.crmCampaign.create({
      data: {
        companyId,
        name: input.name,
        type: input.type || "EMAIL",
        subject: input.subject || null,
        content: input.content || null,
        targetAudience: input.targetAudience || "ALL_LEADS",
        status: input.scheduledAt ? "SCHEDULED" : "DRAFT",
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      }
    })
    revalidatePath("/crm/campaigns")
    return { success: true, campaign }
  } catch (error: any) {
    return { error: error.message || "Failed to create campaign." }
  }
}

export async function launchCrmCampaign(campaignId: string) {
  try {
    const { user, companyId, db } = await requireUserAndTenant()
    const campaign = await db.crmCampaign.findUnique({
      where: { id: campaignId, companyId }
    })
    if (!campaign) return { error: "Campaign not found" }

    // Fetch recipients based on audience
    let recipients: Array<{ id: string; name: string; email: string; type: "LEAD" | "CUSTOMER" }> = []

    if (campaign.targetAudience === "QUALIFIED_LEADS") {
      const leads = await db.crmLead.findMany({
        where: { companyId, status: "QUALIFIED", email: { not: null }, deletedAt: null },
        select: { id: true, name: true, email: true }
      })
      recipients = leads.filter((l: any) => Boolean(l.email)).map((l: any) => ({ ...l, type: "LEAD" }))
    } else if (campaign.targetAudience === "EXISTING_CUSTOMERS") {
      const customers = await db.customer.findMany({
        where: { companyId, email: { not: null }, deletedAt: null },
        select: { id: true, name: true, email: true }
      })
      recipients = customers.filter((c: any) => Boolean(c.email)).map((c: any) => ({ ...c, type: "CUSTOMER" }))
    } else {
      // ALL_LEADS (default)
      const leads = await db.crmLead.findMany({
        where: { companyId, status: { not: "CONVERTED" }, email: { not: null }, deletedAt: null },
        select: { id: true, name: true, email: true }
      })
      recipients = leads.filter((l: any) => Boolean(l.email)).map((l: any) => ({ ...l, type: "LEAD" }))
    }

    if (recipients.length === 0) {
      return { error: `No recipients with valid email addresses found in "${campaign.targetAudience.replace(/_/g, " ")}"` }
    }

    let sentCount = 0
    for (const rec of recipients) {
      try {
        const personalizedSubject = (campaign.subject || "Outreach").replace(/\{\{name\}\}/gi, rec.name)
        const personalizedContent = (campaign.content || "").replace(/\{\{name\}\}/gi, rec.name)

        await db.crmActivity.create({
          data: {
            companyId,
            type: "EMAIL",
            title: `Campaign Outreach: ${personalizedSubject}`,
            description: personalizedContent,
            status: "COMPLETED",
            completedAt: new Date(),
            assignedToId: user.id,
            leadId: rec.type === "LEAD" ? rec.id : null,
            customerId: rec.type === "CUSTOMER" ? rec.id : null,
          }
        })
        sentCount++
      } catch (sendErr) {
        console.warn("Failed to dispatch campaign activity:", sendErr)
      }
    }

    const updated = await db.crmCampaign.update({
      where: { id: campaignId },
      data: {
        status: "ACTIVE",
        sentCount: { increment: sentCount },
      }
    })

    revalidatePath("/crm/campaigns")
    revalidatePath("/crm/activities")
    revalidatePath("/crm/dashboard")
    return { success: true, campaign: updated, sentCount }
  } catch (error: any) {
    return { error: error.message || "Failed to launch campaign." }
  }
}

export async function deleteCrmCampaign(campaignId: string) {
  try {
    const { companyId, db } = await requireUserAndTenant()
    await db.crmCampaign.delete({
      where: { id: campaignId, companyId }
    })
    revalidatePath("/crm/campaigns")
    return { success: true }
  } catch (error: any) {
    return { error: error.message || "Failed to delete campaign." }
  }
}

// ─────────────────────────────────────────────────────────────
// Workflow Studio (Visual Trigger → Conditions → Actions)
// ─────────────────────────────────────────────────────────────

export interface WorkflowCondition {
  field: string
  operator: "equals" | "contains" | "greater_than" | "less_than" | "not_equals"
  value: string | number
}

export interface WorkflowAction {
  actionType: "ASSIGN_USER" | "CREATE_TASK" | "DRAFT_EMAIL" | "UPDATE_STATUS" | "CREATE_INVOICE_DRAFT"
  config: Record<string, any>
}

export async function getCrmWorkflows() {
  try {
    const { companyId, db } = await requireUserAndTenant()
    const workflows = await db.crmWorkflow.findMany({
      where: { companyId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        logs: { orderBy: { executedAt: "desc" }, take: 5 }
      },
      orderBy: { createdAt: "desc" }
    })
    return { success: true, workflows }
  } catch (error: any) {
    return { error: error.message || "Failed to load workflows." }
  }
}

export async function createCrmWorkflow(input: {
  name: string
  description?: string
  triggerType: string
  triggerConfig?: any
  conditions: WorkflowCondition[]
  actions: WorkflowAction[]
  isActive?: boolean
  isDraft?: boolean
}) {
  try {
    const { user, companyId, db } = await requireUserAndTenant()

    const workflow = await db.crmWorkflow.create({
      data: {
        companyId,
        name: input.name,
        description: input.description || null,
        triggerType: input.triggerType,
        triggerConfig: input.triggerConfig || {},
        conditions: input.conditions as any,
        actions: input.actions as any,
        isActive: input.isActive ?? true,
        isDraft: input.isDraft ?? false,
        createdById: user.id,
      }
    })

    revalidatePath("/crm/workflows")
    return { success: true, workflow }
  } catch (error: any) {
    console.error("createCrmWorkflow error:", error)
    return { error: error.message || "Failed to create workflow." }
  }
}

export async function toggleWorkflow(id: string, isActive: boolean) {
  try {
    const { companyId, db } = await requireUserAndTenant()
    const updated = await db.crmWorkflow.update({
      where: { id, companyId },
      data: { isActive, isDraft: false }
    })
    revalidatePath("/crm/workflows")
    return { success: true, workflow: updated }
  } catch (error: any) {
    return { error: error.message || "Failed to toggle workflow." }
  }
}

export async function deleteWorkflow(id: string) {
  try {
    const { companyId, db } = await requireUserAndTenant()
    await db.crmWorkflow.delete({ where: { id, companyId } })
    revalidatePath("/crm/workflows")
    return { success: true }
  } catch (error: any) {
    return { error: error.message || "Failed to delete workflow." }
  }
}

// Workflow Engine Executor
export async function triggerWorkflowsForEvent(
  triggerType: string,
  event: {
    companyId: string
    entityType: "LEAD" | "DEAL" | "CUSTOMER" | "ACTIVITY"
    entityId: string
    data: any
  }
) {
  try {
    const db = await getTenantDb(event.companyId)
    const activeWorkflows = await db.crmWorkflow.findMany({
      where: {
        companyId: event.companyId,
        triggerType,
        isActive: true,
        isDraft: false,
      }
    })

    for (const wf of activeWorkflows) {
      const conditions: WorkflowCondition[] = Array.isArray(wf.conditions) ? wf.conditions : []
      const actions: WorkflowAction[] = Array.isArray(wf.actions) ? wf.actions : []

      // Evaluate Conditions
      let conditionsMet = true
      for (const cond of conditions) {
        const entityVal = event.data[cond.field]
        const targetVal = cond.value

        if (cond.operator === "equals") {
          if (String(entityVal || "").toLowerCase() !== String(targetVal || "").toLowerCase()) {
            conditionsMet = false
            break
          }
        } else if (cond.operator === "contains") {
          if (!String(entityVal || "").toLowerCase().includes(String(targetVal || "").toLowerCase())) {
            conditionsMet = false
            break
          }
        } else if (cond.operator === "greater_than") {
          if (Number(entityVal || 0) <= Number(targetVal || 0)) {
            conditionsMet = false
            break
          }
        } else if (cond.operator === "less_than") {
          if (Number(entityVal || 0) >= Number(targetVal || 0)) {
            conditionsMet = false
            break
          }
        }
      }

      if (!conditionsMet) continue

      // Execute Actions
      const executedActionResults = []
      for (const action of actions) {
        try {
          if (action.actionType === "ASSIGN_USER") {
            let userId = action.config?.userId
            if (!userId) {
              const defaultUser = await db.user.findFirst({ where: { companyId: event.companyId } })
              userId = defaultUser?.id
            }
            if (userId) {
              if (event.entityType === "LEAD") {
                await db.crmLead.update({ where: { id: event.entityId }, data: { assignedToId: userId } })
              } else if (event.entityType === "DEAL") {
                await db.crmDeal.update({ where: { id: event.entityId }, data: { assignedToId: userId } })
              }
              executedActionResults.push({ action: "ASSIGN_USER", status: "SUCCESS", userId })
            }
          } else if (action.actionType === "CREATE_TASK") {
            const dueDays = Number(action.config.dueDays) || 1
            const dueDate = new Date()
            dueDate.setDate(dueDate.getDate() + dueDays)

            await db.crmActivity.create({
              data: {
                companyId: event.companyId,
                type: "TASK",
                title: action.config.title || `Follow up on ${event.entityType.toLowerCase()}`,
                description: action.config.description || "Automated task scheduled by workflow.",
                dueDate,
                status: "PENDING",
                leadId: event.entityType === "LEAD" ? event.entityId : null,
                dealId: event.entityType === "DEAL" ? event.entityId : null,
                customerId: event.entityType === "CUSTOMER" ? event.entityId : (event.data.customerId || null),
              }
            })
            executedActionResults.push({ action: "CREATE_TASK", status: "SUCCESS", dueDate })
          } else if (action.actionType === "DRAFT_EMAIL") {
            await db.crmActivity.create({
              data: {
                companyId: event.companyId,
                type: "EMAIL",
                title: action.config.subject || "Welcome / Follow-up Email Draft",
                description: action.config.body || "Automated email draft prepared by workflow.",
                status: "PENDING",
                leadId: event.entityType === "LEAD" ? event.entityId : null,
                dealId: event.entityType === "DEAL" ? event.entityId : null,
                customerId: event.entityType === "CUSTOMER" ? event.entityId : (event.data.customerId || null),
              }
            })
            executedActionResults.push({ action: "DRAFT_EMAIL", status: "SUCCESS" })
          } else if (action.actionType === "UPDATE_STATUS") {
            const newStatus = action.config.status
            if (newStatus && event.entityType === "LEAD") {
              await db.crmLead.update({ where: { id: event.entityId }, data: { status: newStatus } })
              executedActionResults.push({ action: "UPDATE_STATUS", status: "SUCCESS", newStatus })
            }
          }
        } catch (actErr: any) {
          executedActionResults.push({ action: action.actionType, status: "FAILED", error: actErr.message })
        }
      }

      // Update workflow execution count and record log
      await db.crmWorkflow.update({
        where: { id: wf.id },
        data: {
          executionCount: { increment: 1 },
          lastExecutedAt: new Date()
        }
      })

      await db.crmWorkflowLog.create({
        data: {
          workflowId: wf.id,
          companyId: event.companyId,
          entityType: event.entityType,
          entityId: event.entityId,
          status: "SUCCESS",
          actionsExecuted: executedActionResults as any,
        }
      })
    }
  } catch (error) {
    console.error("triggerWorkflowsForEvent error:", error)
  }
}

// ─────────────────────────────────────────────────────────────
// CRM Dashboard KPIs & Reports
// ─────────────────────────────────────────────────────────────

export async function getCrmDashboardStats() {
  try {
    const { companyId, db } = await requireUserAndTenant()
    await ensureDefaultStages(companyId, db)

    const [deals, leads, pendingActivities, recentActivities, stages] = await Promise.all([
      db.crmDeal.findMany({
        where: { companyId, deletedAt: null },
        include: { stage: true, customer: true }
      }),
      db.crmLead.findMany({
        where: { companyId, deletedAt: null }
      }),
      db.crmActivity.findMany({
        where: { companyId, status: "PENDING" },
        include: { deal: true, lead: true, customer: true, assignedTo: true },
        orderBy: { dueDate: "asc" },
        take: 6
      }),
      db.crmActivity.findMany({
        where: { companyId },
        include: { deal: true, lead: true, customer: true, assignedTo: true },
        orderBy: { createdAt: "desc" },
        take: 8
      }),
      db.crmStage.findMany({
        where: { companyId },
        orderBy: { order: "asc" }
      })
    ])

    const totalPipelineValue = deals.reduce((sum: number, d: any) => sum + (d.value || 0), 0)
    const wonDeals = deals.filter((d: any) => d.status === "WON")
    const totalWonRevenue = wonDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0)
    const totalLostRevenue = deals.filter((d: any) => d.status === "LOST").reduce((sum: number, d: any) => sum + (d.value || 0), 0)

    const convertedLeads = leads.filter((l: any) => l.status === "CONVERTED").length
    const leadConversionRate = leads.length > 0 ? Math.round((convertedLeads / leads.length) * 100) : 0

    const now = new Date()
    now.setHours(23, 59, 59, 999)
    const overdueTasks = pendingActivities.filter((a: any) => a.dueDate && new Date(a.dueDate) < new Date()).length

    // Stage breakdown
    const stageDistribution = stages.map((s: any) => {
      const stageDeals = deals.filter((d: any) => d.stageId === s.id)
      const value = stageDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0)
      return {
        id: s.id,
        name: s.name,
        color: s.color,
        count: stageDeals.length,
        value,
        probability: s.probability
      }
    })

    return {
      success: true,
      stats: {
        totalPipelineValue,
        totalWonRevenue,
        totalLostRevenue,
        totalDeals: deals.length,
        totalLeads: leads.length,
        leadConversionRate,
        pendingActivitiesCount: pendingActivities.length,
        overdueTasks,
        stageDistribution,
        pendingActivities,
        recentActivities,
      }
    }
  } catch (error: any) {
    console.error("getCrmDashboardStats error:", error)
    return { error: error.message || "Failed to load CRM stats." }
  }
}

export async function getCrmReportsData() {
  try {
    const { companyId, db } = await requireUserAndTenant()
    const [deals, leads, users] = await Promise.all([
      db.crmDeal.findMany({
        where: { companyId, deletedAt: null },
        include: { stage: true, assignedTo: true, customer: true }
      }),
      db.crmLead.findMany({
        where: { companyId, deletedAt: null },
        include: { assignedTo: true }
      }),
      db.user.findMany({
        where: { companyId },
        select: { id: true, name: true, email: true }
      })
    ])

    // Lead Sources
    const sourceMap = new Map<string, { total: number; converted: number }>()
    for (const l of leads) {
      const src = l.source || "OTHER"
      const cur = sourceMap.get(src) || { total: 0, converted: 0 }
      cur.total += 1
      if (l.status === "CONVERTED") cur.converted += 1
      sourceMap.set(src, cur)
    }

    const leadSources = Array.from(sourceMap.entries()).map(([source, data]) => ({
      source,
      total: data.total,
      converted: data.converted,
      conversionRate: data.total > 0 ? Math.round((data.converted / data.total) * 100) : 0,
    }))

    // Sales Rep Performance Leaderboard
    const repMap = new Map<string, { name: string; email: string; dealsWon: number; wonValue: number; totalDeals: number }>()
    for (const u of users) {
      repMap.set(u.id, { name: u.name || "Unknown", email: u.email || "", dealsWon: 0, wonValue: 0, totalDeals: 0 })
    }

    for (const d of deals) {
      if (d.assignedToId && repMap.has(d.assignedToId)) {
        const rep = repMap.get(d.assignedToId)!
        rep.totalDeals += 1
        if (d.status === "WON") {
          rep.dealsWon += 1
          rep.wonValue += (d.value || 0)
        }
      }
    }

    const repLeaderboard = Array.from(repMap.values()).sort((a, b) => b.wonValue - a.wonValue)

    // Weighted Revenue Forecast
    const weightedForecast = deals
      .filter((d: any) => d.status === "OPEN")
      .reduce((sum: number, d: any) => sum + ((d.value || 0) * ((d.probability || 50) / 100)), 0)

    return {
      success: true,
      leadSources,
      repLeaderboard,
      weightedForecast: Math.round(weightedForecast),
      totalLeads: leads.length,
      totalDeals: deals.length,
    }
  } catch (error: any) {
    console.error("getCrmReportsData error:", error)
    return { error: error.message || "Failed to load CRM reports." }
  }
}
