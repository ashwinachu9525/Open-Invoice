// src/services/whatsapp/openWaProvider.ts
import { WhatsAppProvider, WhatsAppSendOpts, WhatsAppMessageOpts, WhatsAppResult } from "./provider";
import { prisma } from "@/lib/prisma";

/** Resolve session UUID by its name (= companyId) from the WAHA gateway */
async function findSessionId(gatewayUrl: string, name: string, token: string | null): Promise<string | null> {
  try {
    const res = await fetch(`${gatewayUrl}/api/sessions`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "X-API-Key": token } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const sessions = await res.json();
      if (Array.isArray(sessions)) {
        // First try exact match by company ID name
        const matched = sessions.find((s: any) => s.name === name);
        if (matched) return matched.id;

        // Fallback: if only one session exists, use it regardless of name
        if (sessions.length === 1) return sessions[0].id;

        // Fallback: try common default session names
        const fallback = sessions.find((s: any) => s.name === "default" || s.name === "session" || s.name === "main");
        if (fallback) return fallback.id;
      }
    }
  } catch (e) {
    console.error("OpenWaProvider: failed to list sessions", e);
  }
  return null;
}

export class OpenWaProvider implements WhatsAppProvider {
  async sendMessage(opts: WhatsAppMessageOpts): Promise<WhatsAppResult> {
    const companyId = opts.extra?.companyId;
    if (!companyId) return { success: false, error: "companyId missing for OpenWA provider" };

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { openWaUrl: true, openWaToken: true },
    });

    if (!company?.openWaUrl) {
      return { success: false, error: "OpenWA gateway URL not configured. Please configure it in Settings." };
    }

    const gatewayUrl = company.openWaUrl.replace(/\/$/, "");
    const token = company.openWaToken ?? null;
    const sessionId = await findSessionId(gatewayUrl, companyId, token);

    if (!sessionId) {
      return { success: false, error: "WhatsApp session not active on the gateway. Check Settings → WhatsApp." };
    }

    const payload = { chatId: opts.chatId, text: opts.message };

    try {
      const url = `${gatewayUrl}/api/sessions/${sessionId}/messages/send-text`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "X-API-Key": token } : {}),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      });

      if (!resp.ok) {
        const err = await resp.text();
        return { success: false, error: `OpenWA error ${resp.status}: ${err}` };
      }

      const data = await resp.json();
      await prisma.company.update({
        where: { id: companyId },
        data: { whatsappSentCount: { increment: 1 } },
      });
      return { success: true, messageId: data.id };
    } catch (e: any) {
      if (e.name === "TimeoutError" || e.name === "AbortError") {
        // WAHA often hangs waiting for ACK, but the message is already sent.
        await prisma.company.update({
          where: { id: companyId },
          data: { whatsappSentCount: { increment: 1 } },
        }).catch(() => {});
        return { success: true, messageId: "timeout-assumed-sent" };
      }
      return { success: false, error: e.message };
    }
  }

  async sendDocument(opts: WhatsAppSendOpts): Promise<WhatsAppResult> {
    const companyId = opts.extra?.companyId;
    if (!companyId) return { success: false, error: "companyId missing for OpenWA provider" };

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { openWaUrl: true, openWaToken: true },
    });

    if (!company?.openWaUrl) {
      return { success: false, error: "OpenWA gateway URL not configured. Please configure it in Settings." };
    }

    const gatewayUrl = company.openWaUrl.replace(/\/$/, "");
    const token = company.openWaToken ?? null;
    const sessionId = await findSessionId(gatewayUrl, companyId, token);

    if (!sessionId) {
      return { success: false, error: "WhatsApp session not active on the gateway. Check Settings → WhatsApp." };
    }

    const payload = {
      chatId: opts.chatId,
      base64: opts.base64,
      filename: opts.filename,
      mimetype: opts.mimetype,
      ...(opts.caption ? { caption: opts.caption } : {}),
    };

    try {
      const url = `${gatewayUrl}/api/sessions/${sessionId}/messages/send-document`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "X-API-Key": token } : {}),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });

      if (!resp.ok) {
        const err = await resp.text();
        return { success: false, error: `OpenWA error ${resp.status}: ${err}` };
      }

      const data = await resp.json();
      await prisma.company.update({
        where: { id: companyId },
        data: { whatsappSentCount: { increment: 1 } },
      });
      return { success: true, messageId: data.id };
    } catch (e: any) {
      if (e.name === "TimeoutError" || e.name === "AbortError") {
        await prisma.company.update({
          where: { id: companyId },
          data: { whatsappSentCount: { increment: 1 } },
        }).catch(() => {});
        return { success: true, messageId: "timeout-assumed-sent" };
      }
      return { success: false, error: e.message };
    }
  }
}