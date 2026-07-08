export interface ShortcutBinding {
  key: string
  code?: string
  altKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  metaKey: boolean
}

export interface ShortcutDefinition {
  id: string
  label: string
  group: string
  defaultBinding: ShortcutBinding
  actionUrl: string
}

export const defaultShortcuts: ShortcutDefinition[] = [
  {
    id: "goto_customers",
    label: "Customers",
    group: "SALES",
    defaultBinding: { key: "c", code: "KeyC", altKey: true, ctrlKey: false, shiftKey: false, metaKey: false },
    actionUrl: "/customers",
  },
  {
    id: "goto_new_customer",
    label: "New Customer",
    group: "SALES",
    defaultBinding: { key: "c", code: "KeyC", altKey: true, ctrlKey: false, shiftKey: true, metaKey: false },
    actionUrl: "/customers/new",
  },
  {
    id: "goto_quotations",
    label: "Quotations",
    group: "SALES",
    defaultBinding: { key: "q", code: "KeyQ", altKey: true, ctrlKey: false, shiftKey: false, metaKey: false },
    actionUrl: "/quotations",
  },
  {
    id: "goto_new_quotation",
    label: "New Quotation",
    group: "SALES",
    defaultBinding: { key: "q", code: "KeyQ", altKey: true, ctrlKey: false, shiftKey: true, metaKey: false },
    actionUrl: "/quotations/new",
  },
  {
    id: "goto_invoices",
    label: "Invoices",
    group: "SALES",
    defaultBinding: { key: "i", code: "KeyI", altKey: true, ctrlKey: false, shiftKey: false, metaKey: false },
    actionUrl: "/invoices",
  },
  {
    id: "goto_new_invoice",
    label: "New Invoice",
    group: "SALES",
    defaultBinding: { key: "i", code: "KeyI", altKey: true, ctrlKey: false, shiftKey: true, metaKey: false },
    actionUrl: "/invoices/new",
  },
  {
    id: "goto_expenses",
    label: "Expenses",
    group: "PAYMENTS",
    defaultBinding: { key: "e", code: "KeyE", altKey: true, ctrlKey: false, shiftKey: false, metaKey: false },
    actionUrl: "/expenses",
  },
  {
    id: "goto_new_expense",
    label: "New Expense",
    group: "PAYMENTS",
    defaultBinding: { key: "e", code: "KeyE", altKey: true, ctrlKey: false, shiftKey: true, metaKey: false },
    actionUrl: "/expenses/new",
  },
  {
    id: "goto_dashboard",
    label: "Dashboard",
    group: "NAVIGATION",
    defaultBinding: { key: "d", code: "KeyD", altKey: true, ctrlKey: false, shiftKey: false, metaKey: false },
    actionUrl: "/dashboard",
  },
  {
    id: "goto_settings",
    label: "Settings",
    group: "NAVIGATION",
    defaultBinding: { key: "s", code: "KeyS", altKey: true, ctrlKey: false, shiftKey: false, metaKey: false },
    actionUrl: "/settings",
  },
]

export type UserShortcutConfig = Record<string, ShortcutBinding>

export function formatShortcut(binding: ShortcutBinding): string {
  const parts = []
  if (binding.ctrlKey) parts.push("Ctrl")
  if (binding.altKey) parts.push("Alt")
  if (binding.shiftKey) parts.push("Shift")
  if (binding.metaKey) parts.push("Cmd")
  parts.push(binding.key.toUpperCase())
  return parts.join(" + ")
}

export function matchesBinding(e: KeyboardEvent, binding: ShortcutBinding): boolean {
  const isKeyMatch = binding.code 
    ? e.code === binding.code 
    : e.key.toLowerCase() === binding.key.toLowerCase()

  return (
    isKeyMatch &&
    e.altKey === binding.altKey &&
    e.ctrlKey === binding.ctrlKey &&
    e.shiftKey === binding.shiftKey &&
    e.metaKey === binding.metaKey
  )
}
