// src/services/whatsapp/factory.ts
import { WhatsAppProvider } from "./provider";
import { OpenWaProvider } from "./openwaProvider";
import { MetaProvider } from "./metaProvider";
import { prisma } from "@/lib/prisma";

export async function getWhatsAppProvider(
  companyId: string
): Promise<WhatsAppProvider> {
  // 1️⃣ Try per‑tenant setting
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { whatsappProvider: true },
  });

  const provider = company?.whatsappProvider ?? process.env.WHATSAPP_PROVIDER;

  switch (provider) {
    case "official":
      return new MetaProvider();
    case "openwa":
    default:
      return new OpenWaProvider();
  }
}