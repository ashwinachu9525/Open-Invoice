import { getCrmContacts } from "@/actions/crm"
import { ContactsView } from "@/components/crm/contacts-view"

export const metadata = {
  title: "Contacts & Accounts | CRM Suite",
  description: "Unified directory of customer profiles, companies, deals, and invoice ledgers.",
}

export default async function ContactsPage() {
  const result = await getCrmContacts()
  const contacts = result.contacts || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Contacts & Customer Profiles</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Unified directory of company accounts, contact people, pipeline opportunities, and financial history.
          </p>
        </div>
      </div>

      <ContactsView initialContacts={contacts} />
    </div>
  )
}
