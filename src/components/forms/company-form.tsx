"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { companySchema, CompanyFormValues } from "@/validations/company"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { updateCompany, updateCompanyLogo, removeCompanyLogo } from "@/actions/company"
import { useState, useRef, useCallback, useEffect } from "react"
import { COMMON_CURRENCIES } from "@/lib/currencies"
import { toast } from "sonner"

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"]
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

export function CompanyForm({ initialData }: { initialData: any }) {
  const [isPending, setIsPending] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [hasLogo, setHasLogo] = useState(!!initialData?.logo)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch the current logo preview URL on mount
  useEffect(() => {
    if (initialData?.logo) {
      fetch("/api/logo")
        .then(res => res.json())
        .then(data => {
          if (data.url) setLogoPreview(data.url)
        })
        .catch(() => {
          // Silently fail — preview just won't show
        })
    }
  }, [initialData?.logo])
  
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: initialData?.name || "",
      gstNumber: initialData?.gstNumber || "",
      panNumber: initialData?.panNumber || "",
      cinNumber: initialData?.cinNumber || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      website: initialData?.website || "",
      address: initialData?.address || "",
      state: initialData?.state || "",
      baseCurrency: initialData?.baseCurrency || "INR",
      whatsappProvider: initialData?.whatsappProvider || "",
      invoiceTemplate: initialData?.invoiceTemplate || "modern",
      msmeNumber: initialData?.msmeNumber || "",
      msmeType: initialData?.msmeType || "",
      tcsRate: initialData?.tcsRate ?? 0,
      vpaAddress: initialData?.vpaAddress || "",
      cryptoAddress: initialData?.cryptoAddress || "",
      cryptoNetwork: initialData?.cryptoNetwork || "",
      razorpayKeyId: initialData?.razorpayKeyId || "",
      razorpayKeySecret: initialData?.razorpayKeySecret || "",
      razorpayWebhookSecret: initialData?.razorpayWebhookSecret || "",
      customDomain: initialData?.customDomain || "",
      removeWatermark: initialData?.removeWatermark ?? false,
      showCompanyInEmailFooter: initialData?.showCompanyInEmailFooter ?? false,
    },
  })

  const handleLogoUpload = useCallback(async (file: File) => {
    // Validate file type
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Invalid file type. Please upload PNG, JPG, SVG, or WEBP.")
      return
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large. Maximum size is 2MB.")
      return
    }

    setIsUploadingLogo(true)

    try {
      // Upload to S3 via existing upload API
      const formData = new FormData()
      formData.append("file", file)

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!uploadRes.ok) {
        throw new Error("Upload failed")
      }

      const { url: key } = await uploadRes.json()

      // Save the logo key to the company record
      const result = await updateCompanyLogo(key)

      if (result.success) {
        // Show local preview immediately
        const objectUrl = URL.createObjectURL(file)
        setLogoPreview(objectUrl)
        setHasLogo(true)
        toast.success("Logo uploaded successfully")
      } else {
        toast.error(result.error || "Failed to save logo")
      }
    } catch (error) {
      console.error("Logo upload failed:", error)
      toast.error("Failed to upload logo. Please try again.")
    } finally {
      setIsUploadingLogo(false)
    }
  }, [])

  const handleRemoveLogo = useCallback(async () => {
    setIsUploadingLogo(true)
    try {
      const result = await removeCompanyLogo()
      if (result.success) {
        setLogoPreview(null)
        setHasLogo(false)
        if (fileInputRef.current) fileInputRef.current.value = ""
        toast.success("Logo removed")
      } else {
        toast.error(result.error || "Failed to remove logo")
      }
    } catch {
      toast.error("Failed to remove logo")
    } finally {
      setIsUploadingLogo(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleLogoUpload(files[0])
    }
  }, [handleLogoUpload])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleLogoUpload(files[0])
    }
  }, [handleLogoUpload])

  async function onSubmit(data: CompanyFormValues) {
    setIsPending(true)
    const result = await updateCompany(data)
    setIsPending(false)
    if (result.success) {
      toast.success("Company updated successfully")
    } else {
      toast.error(result.error || "Failed to update")
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Logo Upload Section */}
        <div className="space-y-3">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Company Logo
          </label>
          <p className="text-xs text-muted-foreground">
            This logo will appear on all your invoices and PDF documents.
          </p>
          <div className="flex items-start gap-5">
            {/* Logo Preview */}
            <div
              className="relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 border-dashed transition-colors"
              style={{
                borderColor: logoPreview || hasLogo ? "hsl(var(--border))" : "hsl(var(--muted-foreground) / 0.3)",
                backgroundColor: logoPreview || hasLogo ? "hsl(var(--card))" : "hsl(var(--muted) / 0.3)",
              }}
            >
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Company logo"
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/50">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                </div>
              )}
              {isUploadingLogo && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Upload Drop Zone */}
            <div className="flex-1 space-y-2">
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click() }}
                className="relative rounded-lg border-2 border-dashed px-4 py-4 text-center cursor-pointer transition-all duration-200"
                style={{
                  borderColor: isDragging
                    ? "hsl(var(--primary))"
                    : "hsl(var(--border))",
                  backgroundColor: isDragging
                    ? "hsl(var(--primary) / 0.05)"
                    : "transparent",
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.svg,.webp"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="logo-upload-input"
                />
                <div className="flex flex-col items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" x2="12" y1="3" y2="15" />
                  </svg>
                  <span className="text-sm text-muted-foreground">
                    <span className="font-medium text-primary">Click to upload</span> or drag & drop
                  </span>
                  <span className="text-xs text-muted-foreground/70">
                    PNG, JPG, SVG or WEBP (max 2MB)
                  </span>
                </div>
              </div>

              {(logoPreview || hasLogo) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploadingLogo}
                  onClick={handleRemoveLogo}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                  Remove logo
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-4" />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Name</FormLabel>
                <FormControl>
                  <Input placeholder="ABC Pvt Ltd" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="contact@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="+91 9876543210" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <Input type="url" placeholder="https://example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="gstNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>GSTIN</FormLabel>
                <FormControl>
                  <Input placeholder="22AAAAA0000A1Z5" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="panNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PAN Number</FormLabel>
                <FormControl>
                  <Input placeholder="ABCDE1234F" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cinNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CIN Number</FormLabel>
                <FormControl>
                  <Input placeholder="U12345MH2023PTC123456" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="msmeNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>MSME Udyam Registration Number</FormLabel>
                <FormControl>
                  <Input placeholder="UDYAM-XX-00-0000000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="msmeType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>MSME Category</FormLabel>
                <FormControl>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                    {...field}
                  >
                    <option value="">None / Not Registered</option>
                    <option value="MICRO">Micro Enterprise</option>
                    <option value="SMALL">Small Enterprise</option>
                    <option value="MEDIUM">Medium Enterprise</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tcsRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default TCS Rate (%)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    placeholder="0.0" 
                    {...field} 
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="state"
          render={({ field }) => (
            <FormItem>
              <FormLabel>State (for GST)</FormLabel>
              <FormControl>
                <Input placeholder="Maharashtra" {...field} />
              </FormControl>
              <FormDescription>Used to determine CGST/SGST vs IGST</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business Address</FormLabel>
              <FormControl>
                <Input placeholder="123 Business Street, City, State, PIN" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid gap-4 md:grid-cols-2 pt-4 border-t border-white/10">
          <FormField
            control={form.control}
            name="baseCurrency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Base Currency (Default for new invoices & dashboard)</FormLabel>
                <FormControl>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                    {...field}
                  >
                    {COMMON_CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

            <FormField
              control={form.control}
              name="whatsappProvider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp Provider</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="official">Official Meta Cloud API</SelectItem>
                        <SelectItem value="openwa">OpenWA</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />


        </div>

        <div className="border-t border-white/5 pt-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Payment Collection Settings</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Configure default payment destinations for your business invoices.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="vpaAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default UPI VPA (UPI ID)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. business@upi" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cryptoAddress"
              render={({ field }) => {
                const isTierEligible = initialData?.subscriptionTier === "PRO" || initialData?.subscriptionTier === "ENTERPRISE"
                return (
                  <FormItem>
                    <FormLabel>Default Crypto Wallet Address (PRO)</FormLabel>
                    <FormControl>
                      <div className="relative flex items-center">
                        <Input 
                          placeholder={isTierEligible ? "e.g. 0x123... or bc1q..." : "Upgrade to Pro"} 
                          disabled={!isTierEligible}
                          {...field} 
                          value={field.value ?? ""} 
                          className={!isTierEligible ? "pr-20 cursor-not-allowed opacity-60" : ""}
                        />
                        {!isTierEligible && (
                          <span className="absolute right-3 text-[10px] text-amber-500 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 pointer-events-none">
                            Pro Only
                          </span>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />
            <FormField
              control={form.control}
              name="cryptoNetwork"
              render={({ field }) => {
                const isTierEligible = initialData?.subscriptionTier === "PRO" || initialData?.subscriptionTier === "ENTERPRISE"
                return (
                  <FormItem>
                    <FormLabel>Crypto Network</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={isTierEligible ? "e.g. BSC, ERC20, BTC" : "Upgrade to Pro"} 
                        disabled={!isTierEligible}
                        {...field} 
                        value={field.value ?? ""} 
                        className={!isTierEligible ? "cursor-not-allowed opacity-60" : ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />
            <FormField
              control={form.control}
              name="razorpayKeyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razorpay Key ID</FormLabel>
                  <FormControl>
                    <Input placeholder="rzp_test_..." {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="razorpayKeySecret"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razorpay Key Secret</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="razorpayWebhookSecret"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razorpay Webhook Secret</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Custom Domain Settings Section */}
        <div className="border-t border-white/5 pt-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Custom Domain Configuration</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Host public invoices and billing links on your own custom domain (Growth and Enterprise plans only).</p>
          </div>
          <FormField
            control={form.control}
            name="customDomain"
            render={({ field }) => {
              const isTierEligible = initialData?.subscriptionTier === "PRO" || initialData?.subscriptionTier === "ENTERPRISE"
              return (
                <FormItem className="max-w-md">
                  <FormLabel>Your Custom Domain</FormLabel>
                  <FormControl>
                    <div className="relative flex items-center">
                      <Input 
                        placeholder={isTierEligible ? "e.g. billing.yourcompany.com" : "Upgrade to Pro to configure custom domains"} 
                        disabled={!isTierEligible}
                        {...field}
                        value={field.value ?? ""} 
                        className={!isTierEligible ? "pr-24 cursor-not-allowed opacity-60" : ""}
                      />
                      {!isTierEligible && (
                        <span className="absolute right-3 text-[10px] text-amber-500 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 pointer-events-none">
                          Pro Only
                        </span>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    {isTierEligible 
                      ? "Point your custom domain's DNS CNAME record to cname.open-invoice.com, then enter the domain here." 
                      : "Custom domains are available on Growth (PRO) and Enterprise plans."
                    }
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )
            }}
          />
        </div>

        {/* Email Footer Branding Configuration */}
        <div className="border-t border-white/5 pt-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Email Template Footer Branding</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Control how your organization or client name is presented in the copyright line of outbound email templates (invoices, quotations, and marketing campaigns).</p>
          </div>

          <FormField
            control={form.control}
            name="showCompanyInEmailFooter"
            render={({ field }) => {
              const companyName = form.watch("name") || initialData?.name || "Company"
              const currentYear = new Date().getFullYear()
              const isEnabled = Boolean(field.value)

              return (
                <FormItem className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-white/10 p-4 bg-white/2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FormLabel className="text-sm font-bold text-foreground cursor-pointer">
                        Show Company Name in Email Footer
                      </FormLabel>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${isEnabled ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-500/10 text-slate-400 border-slate-500/20"}`}>
                        {isEnabled ? "ON" : "OFF"}
                      </span>
                    </div>
                    <FormDescription className="text-xs text-muted-foreground">
                      {isEnabled
                        ? `When enabled, footers show © ${currentYear} ${companyName}. All rights reserved.`
                        : `When disabled, footers show © ${currentYear} Open Invoice. All rights reserved.`}
                    </FormDescription>
                    <div className="text-[11px] text-slate-400 font-mono mt-1 pt-1 border-t border-white/5">
                      Copyright Line Preview:{" "}
                      <span className={isEnabled ? "text-emerald-400 font-semibold" : "text-indigo-400 font-semibold"}>
                        &copy; {currentYear} {isEnabled ? companyName : "Open Invoice"}. All rights reserved.
                      </span>
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={Boolean(field.value)}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )
            }}
          />
        </div>

        <Button type="submit" disabled={isPending} className="mt-4">
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </Form>
  )
}
