"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { profileSchema, ProfileFormValues } from "@/validations/profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { updateProfileSettings, checkSlugAvailability } from "@/actions/profile"
import { toast } from "sonner"
import { Loader2, Copy, Check, X } from "lucide-react"

interface ProfileFormProps {
  initialData: {
    slug: string | null
    tagline: string | null
    description: string | null
    twitterUrl: string | null
    linkedinUrl: string | null
    instagramUrl: string | null
    githubUrl: string | null
  }
}

export function ProfileForm({ initialData }: ProfileFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle")
  const [slugSuggestions, setSlugSuggestions] = useState<string[]>([])

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema) as any,
    defaultValues: {
      slug: initialData?.slug || "",
      tagline: initialData?.tagline || "",
      description: initialData?.description || "",
      twitterUrl: initialData?.twitterUrl || "",
      linkedinUrl: initialData?.linkedinUrl || "",
      instagramUrl: initialData?.instagramUrl || "",
      githubUrl: initialData?.githubUrl || "",
    },
  })

  async function onSubmit(data: ProfileFormValues) {
    setIsSubmitting(true)
    const result = await updateProfileSettings(data)
    setIsSubmitting(false)

    if (result.success) {
      toast.success("Profile settings updated")
    } else {
      toast.error(result.error || "Failed to update profile settings")
    }
  }

  const slugValue = form.watch("slug")
  const publicUrl = slugValue ? `${typeof window !== "undefined" ? window.location.origin : ""}/p/${slugValue}` : ""

  // Debounced slug check
  useEffect(() => {
    if (!slugValue || slugValue === initialData?.slug) {
      setSlugStatus("idle")
      setSlugSuggestions([])
      return
    }
    
    setSlugStatus("checking")
    const timeoutId = setTimeout(async () => {
      const res = await checkSlugAvailability(slugValue)
      if (res.available) {
        setSlugStatus("available")
        setSlugSuggestions([])
      } else {
        setSlugStatus("taken")
        setSlugSuggestions(res.suggestions)
      }
    }, 500)
    
    return () => clearTimeout(timeoutId)
  }, [slugValue, initialData?.slug])

  const copyUrl = () => {
    if (!publicUrl) return
    navigator.clipboard.writeText(publicUrl)
    toast.success("URL copied to clipboard!")
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control as any}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Profile Slug</FormLabel>
              <FormControl>
                <div className="flex items-center gap-2">
                  <div className="text-muted-foreground text-sm font-mono flex-shrink-0 bg-white/5 border border-white/10 px-3 py-2 rounded-md">
                    {typeof window !== "undefined" ? window.location.host : "yoursite.com"}/p/
                  </div>
                  <Input placeholder="my-awesome-business" {...field} value={field.value || ""} />
                </div>
              </FormControl>
              <FormDescription>
                Choose a unique handle for your public profile.
              </FormDescription>
              {slugStatus === "checking" && <p className="text-sm text-yellow-500 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin"/> Checking availability...</p>}
              {slugStatus === "available" && <p className="text-sm text-emerald-500 flex items-center gap-1"><Check className="h-3 w-3"/> URL is available!</p>}
              {slugStatus === "taken" && (
                <div className="text-sm text-red-500">
                  <p className="flex items-center gap-1 mb-2"><X className="h-3 w-3"/> This URL is already taken.</p>
                  {slugSuggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="text-slate-400">Available options:</span>
                      {slugSuggestions.map((suggestion) => (
                        <button 
                          key={suggestion}
                          type="button" 
                          onClick={() => {
                            form.setValue("slug", suggestion, { shouldValidate: true })
                            setSlugStatus("available")
                          }}
                          className="px-2 py-0.5 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 rounded border border-indigo-500/30 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {publicUrl && (
                <div className="mt-2 p-3 bg-white/5 border border-white/10 rounded-md flex items-center justify-between">
                  <span className="text-sm font-mono text-indigo-400 break-all">{publicUrl}</span>
                  <Button type="button" variant="ghost" size="icon" onClick={copyUrl} className="h-8 w-8 text-slate-400 hover:text-white">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control as any}
          name="tagline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tagline</FormLabel>
              <FormControl>
                <Input placeholder="A short, catchy phrase..." {...field} value={field.value || ""} />
              </FormControl>
              <FormDescription>
                Appears under your company name. Keep it short.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control as any}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>About Us (Bio)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell clients what you do, your expertise, and why they should choose you..."
                  className="min-h-[120px]"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <h3 className="text-sm font-medium">Social Links</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control as any}
              name="twitterUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Twitter / X URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://twitter.com/..." {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="linkedinUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LinkedIn URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://linkedin.com/in/..." {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="instagramUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instagram URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://instagram.com/..." {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="githubUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GitHub URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://github.com/..." {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Profile Settings
        </Button>
      </form>
    </Form>
  )
}
