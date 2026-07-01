import { Metadata } from "next"

export const metadata: Metadata = {
  title: "HSN Code & SAC Code List with GST Rates | Free Lookup",
  description:
    "Search the complete HSN and SAC code directory with applicable GST rates. Find the right Harmonised System of Nomenclature code for goods or Service Accounting Code for services — free and instant.",
  keywords: [
    "HSN code list",
    "SAC code list",
    "HSN SAC codes with GST rates",
    "GST HSN codes",
    "service accounting code",
    "harmonised system nomenclature India",
  ],
  openGraph: {
    title: "HSN Code & SAC Code Lookup — Free Directory with GST Rates",
    description:
      "Find HSN codes for goods and SAC codes for services under Indian GST — with applicable tax rates. Free, instant, no sign-up needed.",
    type: "website",
  },
}

export default function HsnSacLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
