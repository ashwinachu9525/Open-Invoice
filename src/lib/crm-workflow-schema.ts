export const APPROVED_TRIGGERS = [
  { id: "LEAD_CREATED", label: "New Lead Created", entity: "LEAD" },
  { id: "LEAD_STATUS_CHANGED", label: "Lead Status Changed", entity: "LEAD" },
  { id: "DEAL_CREATED", label: "Deal Created", entity: "DEAL" },
  { id: "DEAL_STAGE_CHANGED", label: "Deal Stage Changed", entity: "DEAL" },
  { id: "DEAL_WON", label: "Deal Won", entity: "DEAL" },
  { id: "ACTIVITY_OVERDUE", label: "Activity Overdue", entity: "ACTIVITY" },
  { id: "MANUAL", label: "Manual Trigger", entity: "ALL" },
] as const

export const APPROVED_OPERATORS = ["equals", "contains", "greater_than", "less_than", "not_equals"] as const

export const APPROVED_ACTIONS = [
  { id: "ASSIGN_USER", label: "Assign Team / User", requiresConfirmation: false },
  { id: "CREATE_TASK", label: "Create Task / Meeting", requiresConfirmation: false },
  { id: "DRAFT_EMAIL", label: "Draft Welcome / Follow-up Email", requiresConfirmation: false },
  { id: "UPDATE_STATUS", label: "Update Status / Stage", requiresConfirmation: true },
  { id: "CREATE_INVOICE_DRAFT", label: "Create Invoice Draft in Invoicing App", requiresConfirmation: true },
] as const

export interface WorkflowCondition {
  field: string
  operator: "equals" | "contains" | "greater_than" | "less_than" | "not_equals"
  value: string | number
}

export interface WorkflowAction {
  actionType: "ASSIGN_USER" | "CREATE_TASK" | "DRAFT_EMAIL" | "UPDATE_STATUS" | "CREATE_INVOICE_DRAFT"
  config: Record<string, any>
}

export interface ProposedAIWorkflow {
  name: string
  description: string
  trigger: {
    type: string
    label: string
  }
  conditions: WorkflowCondition[]
  actions: Array<{
    actionType: "ASSIGN_USER" | "CREATE_TASK" | "DRAFT_EMAIL" | "UPDATE_STATUS" | "CREATE_INVOICE_DRAFT"
    label: string
    config: Record<string, any>
    requiresConfirmation: boolean
  }>
}

export function validateAndNormalizeWorkflow(wf: ProposedAIWorkflow): ProposedAIWorkflow {
  const validTrigger = APPROVED_TRIGGERS.find(t => t.id === wf.trigger?.type) || APPROVED_TRIGGERS[0]

  const validConditions = (wf.conditions || []).filter(c =>
    c.field && APPROVED_OPERATORS.includes(c.operator)
  )

  const validActions = (wf.actions || []).map(act => {
    const approved = APPROVED_ACTIONS.find(a => a.id === act.actionType) || APPROVED_ACTIONS[0]
    return {
      actionType: approved.id,
      label: act.label || approved.label,
      config: act.config || {},
      requiresConfirmation: approved.requiresConfirmation,
    }
  })

  return {
    name: wf.name || "Automated CRM Workflow",
    description: wf.description || "Created via CRM AI Assistant",
    trigger: {
      type: validTrigger.id,
      label: validTrigger.label,
    },
    conditions: validConditions,
    actions: validActions,
  }
}
