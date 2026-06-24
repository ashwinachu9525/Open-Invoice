// src/services/whatsapp/provider.ts
export type WhatsAppSendOpts = {
  chatId: string;                 // e.g. "1234567890@c.us"
  filename: string;               // e.g. "Invoice_2023_08.pdf"
  base64: string;                 // raw base64 (no data:… prefix)
  mimetype: string;               // "application/pdf"
  caption?: string;
  /** optional per‑provider extra fields */
  extra?: Record<string, any>;
};

export type WhatsAppMessageOpts = {
  chatId: string;                 // e.g. "1234567890@c.us"
  message: string;                // text message
  /** optional per‑provider extra fields */
  extra?: Record<string, any>;
};

export type WhatsAppResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

export interface WhatsAppProvider {
  sendMessage(opts: WhatsAppMessageOpts): Promise<WhatsAppResult>;
  sendDocument(opts: WhatsAppSendOpts): Promise<WhatsAppResult>;
}