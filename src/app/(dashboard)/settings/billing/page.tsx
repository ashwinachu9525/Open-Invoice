import { getCompany } from "@/actions/company"
import { getReferralData } from "@/actions/referral"
import { SubscriptionSettingsForm } from "@/components/forms/subscription-settings-form"

export default async function BillingPage() {
  const company = await getCompany()
  const referralData = await getReferralData()

  if (!company) {
    return null
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing & Subscription</h1>
        <p className="text-gray-500 text-sm">Manage your Open-Invoice subscription and referrals.</p>
      </div>

      <SubscriptionSettingsForm
        subscriptionTier={company.subscriptionTier}
        trialStartsAt={company.trialStartsAt}
        trialEndsAt={company.trialEndsAt}
        proRequestStatus={company.proRequestStatus}
        referralCode={referralData?.referralCode ?? null}
        referralRewardClaimed={referralData?.rewardClaimed ?? false}
        successfulReferrals={referralData?.successfulReferrals ?? 0}
      />
    </div>
  )
}
