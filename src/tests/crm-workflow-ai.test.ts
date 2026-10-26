import { describe, it, expect } from "vitest"
import {
  APPROVED_TRIGGERS,
  APPROVED_ACTIONS,
  APPROVED_OPERATORS,
  validateAndNormalizeWorkflow,
} from "@/lib/crm-workflow-schema"

describe("CRM Safe AI Execution & Workflow Validation", () => {
  it("should have approved triggers defined", () => {
    expect(APPROVED_TRIGGERS.length).toBeGreaterThan(0)
    const triggerIds = APPROVED_TRIGGERS.map((t) => t.id)
    expect(triggerIds).toContain("LEAD_CREATED")
    expect(triggerIds).toContain("DEAL_STAGE_CHANGED")
    expect(triggerIds).toContain("DEAL_WON")
  })

  it("should have approved actions with confirmation flags", () => {
    expect(APPROVED_ACTIONS.length).toBeGreaterThan(0)
    const assignAction = APPROVED_ACTIONS.find((a) => a.id === "ASSIGN_USER")
    expect(assignAction).toBeDefined()

    const invoiceDraftAction = APPROVED_ACTIONS.find((a) => a.id === "CREATE_INVOICE_DRAFT")
    expect(invoiceDraftAction).toBeDefined()
    expect(invoiceDraftAction?.requiresConfirmation).toBe(true)
  })

  it("should support all required condition operators", () => {
    expect(APPROVED_OPERATORS).toContain("equals")
    expect(APPROVED_OPERATORS).toContain("contains")
    expect(APPROVED_OPERATORS).toContain("greater_than")
    expect(APPROVED_OPERATORS).toContain("less_than")
  })

  it("should validate and normalize a proposed workflow safely", () => {
    const rawWorkflow = {
      name: "Bengaluru Inbound Workflow",
      description: "Auto-assign leads from Bengaluru",
      trigger: {
        type: "LEAD_CREATED",
        label: "New Lead Created",
      },
      conditions: [
        { field: "region", operator: "equals" as const, value: "Bengaluru" },
      ],
      actions: [
        {
          actionType: "ASSIGN_USER" as const,
          label: "Assign to Sales Team",
          config: { userId: "user-123" },
          requiresConfirmation: false,
        },
        {
          actionType: "CREATE_TASK" as const,
          label: "Schedule follow-up task",
          config: { title: "Follow up tomorrow", dueDays: 1 },
          requiresConfirmation: false,
        },
      ],
    }

    const validated = validateAndNormalizeWorkflow(rawWorkflow)
    expect(validated.name).toBe("Bengaluru Inbound Workflow")
    expect(validated.trigger.type).toBe("LEAD_CREATED")
    expect(validated.conditions.length).toBe(1)
    expect(validated.conditions[0].value).toBe("Bengaluru")
    expect(validated.actions.length).toBe(2)
  })
})
