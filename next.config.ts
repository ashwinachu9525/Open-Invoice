import type { NextConfig } from "next"
import withPWAInit from "@ducanh2912/next-pwa"

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  workboxOptions: {
    disableDevLogs: true,
  },
})

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ['192.168.0.4'],
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-pg",
    "@prisma/adapter-libsql",
    "@libsql/client",
    "@react-pdf/renderer",
    "argon2",
    "pg",
    "prisma",
  ],
}

export default withPWA(nextConfig)
