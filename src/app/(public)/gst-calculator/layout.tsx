import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Free GST Calculator — Calculate GST Online | CGST SGST IGST",
  description:
    "Calculate GST instantly — add or remove GST from any amount. Get a detailed breakdown of CGST, SGST, and IGST for all GST slab rates (0%, 5%, 12%, 18%, 28%). Free, no sign-up required.",
  keywords: [
    "GST calculator",
    "calculate GST online",
    "GST inclusive exclusive calculator",
    "CGST SGST calculator",
    "IGST calculator",
    "Indian GST calculator free",
  ],
  openGraph: {
    title: "Free GST Calculator — CGST, SGST & IGST Breakdown",
    description:
      "Add or remove GST from any amount. Get a detailed CGST/SGST/IGST breakdown for all GST rates. Free and instant.",
    type: "website",
  },
}

export default function GstCalculatorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
