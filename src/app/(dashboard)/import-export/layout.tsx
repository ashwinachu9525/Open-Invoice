import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Import / Export | Open Invoice",
  description: "Bulk import catalogs and customers via CSV. Export all data. Upload legacy invoices via OCR, XML, or JSON.",
}

export default function ImportExportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
