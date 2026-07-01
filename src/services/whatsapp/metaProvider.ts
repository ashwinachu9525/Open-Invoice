// src/services/whatsapp/metaProvider.ts
import { WhatsAppProvider, WhatsAppSendOpts, WhatsAppMessageOpts, WhatsAppResult } from "./provider";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto"; // assuming decrypt helper exists

export class MetaProvider implements WhatsAppProvider {
  /**
   * Send a document via Meta (official) WhatsApp Cloud API.
   * The caller must provide `extra.companyId` so we can fetch credentials.
   */
  async sendDocument(opts: WhatsAppSendOpts): Promise<WhatsAppResult> {
    const companyId = opts.extra?.companyId;
    if (!companyId) {
      return { success: false, error: "Company ID missing for Meta provider" };
    }
    // Retrieve stored credentials (phone ID and encrypted token).
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { whatsappPhoneId: true, whatsappMetaToken: true },
    });
    const phoneId = company?.whatsappPhoneId;
    const accessToken = company?.whatsappMetaToken ? decrypt(company.whatsappMetaToken, companyId) : undefined;
    if (!phoneId || !accessToken) {
      return { success: false, error: "Meta WhatsApp credentials missing" };
    }

    const url = `https://graph.facebook.com/v13.0/${phoneId}/messages`;
    const payload = {
      messaging_product: "whatsapp",
      to: opts.chatId.replace(/@c\.us$/, ""),
      type: "document",
      document: {
        filename: opts.filename,
        mime_type: opts.mimetype,
        data: opts.base64,
        caption: opts.caption,
      },
    };

    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const body = await resp.json();
      if (!resp.ok) {
        return { success: false, error: body.error?.message ?? "Meta API error" };
      }
      // Increment usage counter for the company.
      await prisma.company.update({
        where: { id: companyId },
        data: { whatsappSentCount: { increment: 1 } },
      });
      return { success: true, messageId: body.messages?.[0]?.id };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
  async sendMessage(opts: WhatsAppMessageOpts): Promise<WhatsAppResult> {
    const companyId = opts.extra?.companyId;
    if (!companyId) {
      return { success: false, error: "Company ID missing for Meta provider" };
    }
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { whatsappPhoneId: true, whatsappMetaToken: true },
    });
    const phoneId = company?.whatsappPhoneId;
    const accessToken = company?.whatsappMetaToken ? decrypt(company.whatsappMetaToken, companyId) : undefined;
    if (!phoneId || !accessToken) {
      return { success: false, error: "Meta WhatsApp credentials missing" };
    }
    const url = `https://graph.facebook.com/v13.0/${phoneId}/messages`;
    const payload = {
      messaging_product: "whatsapp",
      to: opts.chatId.replace(/@c\.us$/, ""),
      type: "text",
      text: { body: opts.message },
    };
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const body = await resp.json();
      if (!resp.ok) {
        return { success: false, error: body.error?.message ?? "Meta API error" };
      }
      await prisma.company.update({
        where: { id: companyId },
        data: { whatsappSentCount: { increment: 1 } },
      });
      return { success: true, messageId: body.messages?.[0]?.id };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}