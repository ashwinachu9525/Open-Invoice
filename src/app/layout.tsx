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
      <body className="min-h-full flex flex-col">
        <Script defer data-domain="open-invoice.com" src="https://plausible.io/js/script.js" />
        <Providers>{children}</Providers>
        <Toaster />
        <PwaInstallPrompt />
        <Analytics />
      </body>
    </html>
  )
}
