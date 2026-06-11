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
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts',
          expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'static-font-assets',
          expiration: { maxEntries: 4, maxAgeSeconds: 7 * 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'static-image-assets',
          expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /\/_next\/image\?url=.+$/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'next-image',
          expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /\/api\/.*$/i,
        handler: 'NetworkOnly',
        method: 'POST',
        options: {
          backgroundSync: {
            name: 'api-sync-queue',
            options: {
              maxRetentionTime: 24 * 60, // 24 hours
            },
          },
        },
      },
      {
        urlPattern: /\/api\/.*$/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'apis',
          expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
          networkTimeoutSeconds: 10,
        },
      },
    ],
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
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ]
  },
}

export default withPWA(nextConfig)
