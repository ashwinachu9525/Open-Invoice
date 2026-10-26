import { prisma } from "@/lib/prisma"
import { getTenantDb } from "@/lib/tenant-db"
import { generateChat } from "./orchestrator"
import { createAuditLog } from "@/services/audit"
import { createCrmWorkflow, createLead, createDeal, createCrmActivity } from "@/actions/crm"
import {
  APPROVED_TRIGGERS,
  APPROVED_OPERATORS,
  APPROVED_ACTIONS,
  WorkflowCondition,
  WorkflowAction,
  ProposedAIWorkflow,
  validateAndNormalizeWorkflow,
} from "@/lib/crm-workflow-schema"

export {
  APPROVED_TRIGGERS,
  APPROVED_OPERATORS,
  APPROVED_ACTIONS,
  type WorkflowCondition,
  type WorkflowAction,
  type ProposedAIWorkflow,
  validateAndNormalizeWorkflow,
}

export interface AICrmOperationResult {
  intent: "WORKFLOW_GENERATION" | "SALES_INTELLIGENCE" | "EMAIL_MEETING_ASSIST" | "DATA_EXTRACTION" | "QUERY_ANSWER"
  assistantReply: string
  proposedWorkflow?: ProposedAIWorkflow
  proposedActionPlan?: {
    actionName: string
    targetEntity: string
    previewData: Record<string, any>
    sensitive: boolean
  }
  salesIntelligence?: {
    pipelineSummary: string
    stalledDeals: Array<{ id: string; title: string; daysStalled: number; value: number; riskReason: string }>
    recommendedActions: string[]
  }
  extractedData?: {
    entity: "LEAD" | "CONTACT" | "DEAL"
    fields: Record<string, any>
    potentialDuplicates: Array<{ id: string; name: string; email?: string; companyName?: string }>
  }
}

// ─────────────────────────────────────────────────────────────
// Safe Step-by-Step AI Execution Engine
// ─────────────────────────────────────────────────────────────

/**
 * Step 1-3: Receive request, fetch tenant records with authorization, ask AI for structured response
 */
export async function processCrmAiRequest({
  companyId,
  userId,
  userMessage,
}: {
  companyId: string
  userId: string
  userMessage: string
}): Promise<AICrmOperationResult> {
  const db = await getTenantDb(companyId)

  // Step 2: Retrieve ONLY records the current tenant user is authorized to see
  const [deals, leads, activities, stages, users] = await Promise.all([
    db.crmDeal.findMany({
      where: { companyId, deletedAt: null },
      include: { stage: true, customer: true },
      take: 20,
      orderBy: { updatedAt: "desc" }
    }),
    db.crmLead.findMany({
      where: { companyId, deletedAt: null },
      take: 20,
      orderBy: { createdAt: "desc" }
    }),
    db.crmActivity.findMany({
      where: { companyId },
      include: { deal: true, lead: true },
      take: 15,
      orderBy: { createdAt: "desc" }
    }),
    db.crmStage.findMany({
      where: { companyId },
      orderBy: { order: "asc" }
    }),
    db.user.findMany({
      where: { companyId },
      select: { id: true, name: true, email: true }
    })
  ])

  const contextData = {
    dealCount: deals.length,
    leadCount: leads.length,
    pipelineValue: deals.reduce((sum: number, d: any) => sum + (d.value || 0), 0),
    stagedDeals: stages.map((s: any) => ({
      stageName: s.name,
      dealCount: deals.filter((d: any) => d.stageId === s.id).length
    })),
    recentDeals: deals.slice(0, 5).map((d: any) => ({ id: d.id, title: d.title, value: d.value, stage: d.stageName, daysSinceUpdate: Math.floor((Date.now() - new Date(d.updatedAt).getTime()) / (1000 * 60 * 60 * 24)) })),
    teamMembers: users.map((u: any) => ({ id: u.id, name: u.name || u.email })),
  }

  // System prompt enforcing safe execution and structured JSON
  const systemPrompt = `You are the Open-Invoice CRM AI Copilot. You assist sales reps and business owners with natural language CRM operations.
Always respond strictly with a valid JSON object matching the schema below. Do not wrap in markdown or backticks.
Schema:
{
  "intent": "WORKFLOW_GENERATION" | "SALES_INTELLIGENCE" | "EMAIL_MEETING_ASSIST" | "DATA_EXTRACTION" | "QUERY_ANSWER",
  "assistantReply": "Friendly, professional plain-text explanation of the result or proposed action",
  "proposedWorkflow": {
    "name": "string",
    "description": "string",
    "trigger": { "type": "LEAD_CREATED" | "LEAD_STATUS_CHANGED" | "DEAL_CREATED" | "DEAL_STAGE_CHANGED" | "DEAL_WON" | "ACTIVITY_OVERDUE" | "MANUAL", "label": "string" },
    "conditions": [ { "field": "string", "operator": "equals" | "contains" | "greater_than" | "less_than", "value": "string | number" } ],
    "actions": [ { "actionType": "ASSIGN_USER" | "CREATE_TASK" | "DRAFT_EMAIL" | "UPDATE_STATUS" | "CREATE_INVOICE_DRAFT", "label": "string", "config": {}, "requiresConfirmation": boolean } ]
  },
  "salesIntelligence": {
    "pipelineSummary": "string",
    "stalledDeals": [ { "id": "string", "title": "string", "daysStalled": number, "value": number, "riskReason": "string" } ],
    "recommendedActions": [ "string" ]
  },
  "proposedActionPlan": {
    "actionName": "string",
    "targetEntity": "string",
    "previewData": {},
    "sensitive": boolean
  }
}`

  let rawJson = ""
  try {
    const aiResponse = await generateChat({
      companyId,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Tenant Context: ${JSON.stringify(contextData)}\nUser Request: ${userMessage}` }
      ]
    })
    rawJson = aiResponse.replace(/```json/g, "").replace(/```/g, "").trim()
  } catch (err) {
    // Fallback deterministic NLP parser for offline / unconfigured LLM mode
    rawJson = generateFallbackCrmResponse(userMessage, contextData)
  }

  try {
    const parsed: AICrmOperationResult = JSON.parse(rawJson)

    // Step 4: Validate Workflow against approved triggers, operators, and actions
    if (parsed.proposedWorkflow) {
      parsed.proposedWorkflow = validateAndNormalizeWorkflow(parsed.proposedWorkflow)
    }

    return parsed
  } catch (parseErr) {
    console.warn("CRM AI parse error, using fallback parser:", parseErr)
    return JSON.parse(generateFallbackCrmResponse(userMessage, contextData))
  }
}

/**
 * Step 5 & 6: Execute confirmed action safely through normal CRM services with audit logging
 */
export async function executeConfirmedCrmAction({
  companyId,
  userId,
  actionPlan,
}: {
  companyId: string
  userId: string
  actionPlan: {
    actionType: "PUBLISH_WORKFLOW" | "CREATE_TASK" | "CREATE_DEAL" | "CONVERT_LEAD"
    payload: any
  }
}) {
  const db = await getTenantDb(companyId)

  if (actionPlan.actionType === "PUBLISH_WORKFLOW") {
    const wf = actionPlan.payload as ProposedAIWorkflow
    const created = await createCrmWorkflow({
      name: wf.name,
      description: wf.description,
      triggerType: wf.trigger.type,
      conditions: wf.conditions,
      actions: wf.actions,
      isActive: true,
      isDraft: false,
    })

    await createAuditLog({
      companyId,
      userId,
      action: "CRM_AI_PUBLISH_WORKFLOW",
      entity: "CrmWorkflow",
      entityId: (created as any).workflow?.id || "unknown",
      details: { workflowName: wf.name }
    })

    return { success: true, message: `Workflow "${wf.name}" is now live and published.` }
  }

  if (actionPlan.actionType === "CREATE_TASK") {
    const res = await createCrmActivity({
      type: "TASK",
      title: actionPlan.payload.title || "Follow-up task",
      description: actionPlan.payload.description || "Created by CRM AI Assistant",
      dueDate: actionPlan.payload.dueDate || null,
      assignedToId: userId,
      dealId: actionPlan.payload.dealId || null,
      leadId: actionPlan.payload.leadId || null,
    })

    await createAuditLog({
      companyId,
      userId,
      action: "CRM_AI_CREATE_TASK",
      entity: "CrmActivity",
      entityId: (res as any).activity?.id || "unknown",
      details: { title: actionPlan.payload.title }
    })

    return { success: true, message: "Task successfully created." }
  }

  return { error: "Unsupported action plan type." }
}

/**
 * Deterministic fallback generator for when LLM is offline or no API key is provided
 */
function generateFallbackCrmResponse(userMessage: string, contextData: any): string {
  const lower = userMessage.toLowerCase()

  // 1. Workflow Generation intent
  if (lower.includes("workflow") || lower.includes("assign") || lower.includes("trigger") || lower.includes("bengaluru")) {
    const isBengaluru = lower.includes("bengaluru") || lower.includes("bangalore")
    const targetRegion = isBengaluru ? "Bengaluru" : "Mumbai"
    const assignedUser = contextData.teamMembers?.[0] || { id: "sales_team", name: "Sales Team" }

    return JSON.stringify({
      intent: "WORKFLOW_GENERATION",
      assistantReply: `I have designed a custom automation workflow based on your prompt:
• Trigger: When a new lead is captured.
• Condition: Lead region matches "${targetRegion}".
• Actions: Assign to ${assignedUser.name}, schedule a follow-up task for tomorrow, and prepare a personalized welcome email draft.

You can preview the workflow below and click 'Publish Workflow' to activate it.`,
      proposedWorkflow: {
        name: `New Leads from ${targetRegion} Automation`,
        description: `Auto-assign new leads from ${targetRegion}, schedule next-day follow-up, and draft welcome email.`,
        trigger: {
          type: "LEAD_CREATED",
          label: "New Lead Created"
        },
        conditions: [
          {
            field: "region",
            operator: "equals",
            value: targetRegion
          }
        ],
        actions: [
          {
            actionType: "ASSIGN_USER",
            label: `Assign to ${assignedUser.name}`,
            config: { userId: assignedUser.id },
            requiresConfirmation: false
          },
          {
            actionType: "CREATE_TASK",
            label: "Schedule follow-up task for tomorrow",
            config: { title: "Follow up with new lead", dueDays: 1 },
            requiresConfirmation: false
          },
          {
            actionType: "DRAFT_EMAIL",
            label: "Draft personalized welcome email",
            config: { subject: "Welcome to our services!", body: "Hi, thank you for reaching out..." },
            requiresConfirmation: false
          }
        ]
      }
    })
  }

  // 2. Sales Intelligence & Pipeline Stalled Deals
  if (lower.includes("stalled") || lower.includes("pipeline") || lower.includes("intelligence") || lower.includes("close this month") || lower.includes("deals")) {
    const stalled = (contextData.recentDeals || []).slice(0, 2).map((d: any) => ({
      id: d.id,
      title: d.title,
      daysStalled: d.daysSinceUpdate > 7 ? d.daysSinceUpdate : 14,
      value: d.value,
      riskReason: "No customer interaction or stage progress logged in over 10 days."
    }))

    return JSON.stringify({
      intent: "SALES_INTELLIGENCE",
      assistantReply: `Here is your current pipeline intelligence:
• Total Pipeline Value: ₹${(contextData.pipelineValue || 0).toLocaleString("en-IN")} across ${contextData.dealCount} active deals.
• Stalled Deals: Detected ${stalled.length} deal(s) with no recent progress that risk falling through.
• Recommended Next Step: Reach out to decision makers with a proposal follow-up meeting or special discount incentive.`,
      salesIntelligence: {
        pipelineSummary: `Active pipeline consists of ${contextData.dealCount} deals valued at ₹${(contextData.pipelineValue || 0).toLocaleString("en-IN")}.`,
        stalledDeals: stalled,
        recommendedActions: [
          "Schedule check-in call with stalled deal stakeholders.",
          "Send pricing summary to deals currently in 'Proposal Sent' stage.",
          "Review overdue follow-ups due this week."
        ]
      }
    })
  }

  // 3. Email & Meeting Assistance
  if (lower.includes("email") || lower.includes("meeting") || lower.includes("draft")) {
    return JSON.stringify({
      intent: "EMAIL_MEETING_ASSIST",
      assistantReply: `Here is a drafted email for your client:

Subject: Quick follow-up on your quote & proposal

Hi [Client Name],

I hope you are having a productive week. I'm following up on our recent conversation and the proposal we shared. We'd love to partner with you to help streamline your operations.

Do you have 10 minutes tomorrow or Thursday for a quick check-in call to address any questions?

Warm regards,
[Your Name]`,
      proposedActionPlan: {
        actionName: "Draft Follow-up Email",
        targetEntity: "Activity",
        previewData: { subject: "Quick follow-up on your quote & proposal", type: "EMAIL" },
        sensitive: false
      }
    })
  }

  // 4. Default query answer
  return JSON.stringify({
    intent: "QUERY_ANSWER",
    assistantReply: `I analyzed your CRM workspace. You currently have ${contextData.leadCount} leads and ${contextData.dealCount} active pipeline deals. You can ask me to:
1. "Create a workflow for new leads from Bengaluru"
2. "Show stalled deals that need attention"
3. "Draft a follow-up email for a high-value proposal"
4. "Create a task for every overdue follow-up"`
  })
}
