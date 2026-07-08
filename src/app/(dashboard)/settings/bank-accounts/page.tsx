import { getBankAccounts } from "@/actions/bank-accounts"
import { getCompany } from "@/actions/company"
import { BankAccountsForm } from "@/components/forms/bank-accounts-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function BankAccountsPage() {
  const bankAccounts = await getBankAccounts()
  const company = await getCompany()
  
  const isPro = company?.subscriptionTier === "PRO" || company?.subscriptionTier === "ENTERPRISE"

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bank Accounts</h1>
        <p className="text-gray-500 text-sm">Manage your bank accounts. You can easily select them when generating new invoices.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bank Accounts</CardTitle>
          <CardDescription>
            Add your bank details so clients know where to send payments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BankAccountsForm initialAccounts={bankAccounts} isPro={isPro} />
        </CardContent>
      </Card>
    </div>
  )
}
