import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Providers } from "@/components/providers"
import { Toaster } from "@/components/ui/sonner"
import { PwaInstallPrompt } from "@/components/pwa-install-prompt"
import { Analytics } from "@vercel/analytics/react"
import Script from "next/script"
import "./globals.css"
import { auth } from "@/auth"
import { headers } from "next/headers"
import { getSystemConfig } from "@/lib/system-config"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Invoice AI"

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://open-invoice.com"),
  title: {
    default: `${appName} - Smart Invoicing Software`,
    template: `%s | ${appName}`
  },
  description: "Production-ready invoice management for Indian businesses with GST, TDS, and AI features. Generate beautiful invoices in seconds.",
  applicationName: appName,
  keywords: ["invoice generator", "gst billing software", "free invoice maker", "indian business invoicing", "ai invoice"],
  authors: [{ name: appName }],
  creator: appName,
  publisher: appName,
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName: appName,
    title: `${appName} - Smart Invoicing Software`,
    description: "Production-ready invoice management for Indian businesses with GST, TDS, and AI features.",
    images: [{ url: "/icon512_maskable.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${appName} - Smart Invoicing Software`,
    description: "Production-ready invoice management for Indian businesses with GST, TDS, and AI features.",
    creator: "@" + appName.replace(/\s+/g, "").toLowerCase(),
    images: ["/icon512_maskable.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  appleWebApp: {
    capable: true,
    title: appName,
    statusBarStyle: "default",
  },
}

export const viewport: Viewport = {
  themeColor: "#1e40af",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth()
  const pathname = (await headers()).get("x-pathname") || ""
  const config = await getSystemConfig()

  const isMaintenance = config.maintenanceMode
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN"
  const isAllowedRoute = 
    pathname.startsWith("/admin") || 
    pathname === "/login" || 
    pathname.startsWith("/api/auth")

  const showMaintenance = isMaintenance && !isSuperAdmin && !isAllowedRoute && pathname

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Script defer data-domain="open-invoice.com" src="https://plausible.io/js/script.js" />
        <Providers>
          {showMaintenance ? (
            <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-950 text-slate-100 p-6 text-center select-none animate-in fade-in duration-500">
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 blur-xl opacity-30 animate-pulse"></div>
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-slate-900 border border-slate-800 text-amber-500 shadow-xl mb-6">
                  <svg className="w-10 h-10 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                System Maintenance
              </h1>
              <p className="mt-4 text-slate-400 max-w-md text-sm leading-relaxed">
                We are currently upgrading the platform to bring you new features and improvements. Tenant portals are temporarily offline and will be back shortly.
              </p>
              <div className="mt-8 text-xs text-muted-foreground font-mono bg-slate-900/50 border border-slate-850 px-3 py-1.5 rounded-full">
                Central Administrator Mode Active
              </div>
            </div>
          ) : (
            children
          )}
        </Providers>
        <Toaster />
        <PwaInstallPrompt />
        <Analytics />
      </body>
    </html>
  )
}
