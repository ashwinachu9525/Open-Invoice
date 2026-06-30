import { prisma } from "@/lib/prisma"
import { unstable_cache } from "next/cache"

export interface SystemConfig {
  maintenanceMode: boolean
  registrationOpen: boolean
  systemLogLevel: string
  requireEmailVerification: boolean
}

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  maintenanceMode: false,
  registrationOpen: true,
  systemLogLevel: "info",
  requireEmailVerification: false
}

export const getSystemConfig = unstable_cache(
  async (): Promise<SystemConfig> => {
    try {
      const config = await prisma.systemConfig.findUnique({
        where: { id: 1 }
      })
      if (config) {
        return {
          maintenanceMode: config.maintenanceMode,
          registrationOpen: config.registrationOpen,
          systemLogLevel: config.systemLogLevel,
          requireEmailVerification: config.requireEmailVerification
        }
      }
    } catch (err) {
      console.error("Failed to read system config from database:", err)
    }
    return DEFAULT_SYSTEM_CONFIG
  },
  ["system-config-cache"],
  { tags: ["system-config"] }
)
