import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Providers } from "@/components/providers"
import { Toaster } from "@/components/ui/sonner"
import { PwaInstallPrompt } from "@/components/pwa-install-prompt"
import { Analytics } from "@vercel/analytics/react"
import Script from "next/script"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Invoice AI",
  description: "Production-ready invoice management for Indian businesses with GST, TDS, and AI features",
  applicationName: "Invoice AI",
  appleWebApp: {
    capable: true,
    title: "Invoice AI",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script defer data-domain="open-invoice.com" src="https://plausible.io/js/script.js" />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        <Toaster />
        <PwaInstallPrompt />
        <Analytics />
      </body>
    </html>
  )
}
