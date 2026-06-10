import type { NextConfig } from "next"

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

export default nextConfig
