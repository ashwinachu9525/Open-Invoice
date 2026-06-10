import { calculateInvoiceTax } from "@/services/tax-engine"
import { generateText } from "./orchestrator"

export interface AIGeneratedInvoice {
  customerName: string
  customerCompany?: string
  customerGstin?: string
  customerState?: string
  items: {
    description: string
    hsnSac?: string
    quantity: number
    unitPrice: number
    discount: number
    taxPercentage: number
  }[]
  tdsPercentage: number
  notes?: string
  taxBreakdown: ReturnType<typeof calculateInvoiceTax>
}

export async function generateInvoiceFromPrompt(
  companyId: string,
  prompt: string,
  sellerState?: string
): Promise<AIGeneratedInvoice> {
  const fullPrompt = `You are an Indian invoice assistant. Parse invoice requests and return ONLY raw JSON matching this schema:
{
  "customerName": string,
  "customerCompany": string?,
  "customerGstin": string?,
  "customerState": string (Indian state),
  "items": [{ "description": string, "hsnSac": string?, "quantity": number, "unitPrice": number, "discount": number, "taxPercentage": number }],
  "tdsPercentage": number (0, 1, 2, 5, or 10),
  "notes": string?
}
Use INR. Default GST is 18% unless specified. Extract TDS if mentioned.
Do not include markdown formatting or \`\`\`json tags. Only return the JSON object.

User Request:
${prompt}`

  const responseText = await generateText({ companyId, prompt: fullPrompt })
  
  // Clean up potential markdown formatting from generic models
  const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim()
  
  const parsed = JSON.parse(cleanJson) as Omit<AIGeneratedInvoice, "taxBreakdown">
  const taxBreakdown = calculateInvoiceTax({
    items: parsed.items,
    sellerState,
    buyerState: parsed.customerState,
    tdsPercentage: parsed.tdsPercentage,
  })

  return { ...parsed, taxBreakdown }
}

export async function generateEmailContent(
  companyId: string,
  type: "invoice" | "reminder" | "followup" | "thankyou",
  context: { customerName: string; invoiceNumber: string; amount: number; dueDate?: string }
): Promise<string> {
  const prompt = `System: Write professional, concise business emails for Indian B2B invoicing. Return only the email body in HTML format.

User: Write a ${type} email for customer ${context.customerName}, invoice ${context.invoiceNumber}, amount ₹${context.amount}${context.dueDate ? `, due ${context.dueDate}` : ""}.`

  return await generateText({ companyId, prompt })
}
