import { getCompanyProfileSettings, generateUniqueSlug } from "@/actions/profile"
import { ProfileForm } from "@/components/forms/profile-form"
import { TestimonialList } from "@/components/forms/testimonial-list"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = {
  title: "Public Profile Settings",
  description: "Manage your public showcase profile.",
}

export default async function ProfileSettingsPage() {
  const company = await getCompanyProfileSettings()

  let suggestedSlug = company?.slug
  if (!suggestedSlug && company?.name) {
    suggestedSlug = await generateUniqueSlug(company.name, company.id)
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Public Showcase Profile</h1>
        <p className="text-gray-500">Configure your custom public URL, bio, and social links to showcase your business to clients.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
          <CardDescription>
            Update your public profile URL and information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm initialData={company ? {
            slug: suggestedSlug || null,
            tagline: company.tagline,
            description: company.description,
            twitterUrl: company.twitterUrl,
            linkedinUrl: company.linkedinUrl,
            instagramUrl: company.instagramUrl,
            githubUrl: company.githubUrl,
          } : {
            slug: null,
            tagline: null,
            description: null,
            twitterUrl: null,
            linkedinUrl: null,
            instagramUrl: null,
            githubUrl: null,
          }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Client Testimonials</CardTitle>
          <CardDescription>
            Add reviews and testimonials from your past clients to display on your public profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TestimonialList testimonials={company?.testimonials || []} />
        </CardContent>
      </Card>
    </div>
  )
}
