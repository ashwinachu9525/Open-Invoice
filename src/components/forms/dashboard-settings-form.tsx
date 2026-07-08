"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { updateDashboardConfig } from "@/actions/user"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

const formSchema = z.object({
  showRevenueChart: z.boolean(),
  showAgingChart: z.boolean(),
  showCustomerRevenueChart: z.boolean(),
  showTaxCards: z.boolean(),
  showQuickActions: z.boolean(),
  showRecentInvoices: z.boolean(),
  showRecentQuotations: z.boolean(),
  showRecentExpenses: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

interface Props {
  initialData?: any
}

export function DashboardSettingsForm({ initialData }: Props) {
  const [isLoading, setIsLoading] = useState(false)

  const defaultValues: FormValues = {
    showRevenueChart: initialData?.showRevenueChart ?? true,
    showAgingChart: initialData?.showAgingChart ?? true,
    showCustomerRevenueChart: initialData?.showCustomerRevenueChart ?? true,
    showTaxCards: initialData?.showTaxCards ?? true,
    showQuickActions: initialData?.showQuickActions ?? true,
    showRecentInvoices: initialData?.showRecentInvoices ?? true,
    showRecentQuotations: initialData?.showRecentQuotations ?? true,
    showRecentExpenses: initialData?.showRecentExpenses ?? true,
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  async function onSubmit(data: FormValues) {
    setIsLoading(true)
    try {
      const res = await updateDashboardConfig(data)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("Dashboard layout updated")
      }
    } catch (error) {
      toast.error("Failed to update layout")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="showRevenueChart"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Revenue Chart</FormLabel>
                  <FormDescription>
                    Show the monthly revenue trend chart on your dashboard.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="showAgingChart"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Aging Chart</FormLabel>
                  <FormDescription>
                    Show the aging bucket (0-30 days, 31-60 days, etc.) for unpaid invoices.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="showCustomerRevenueChart"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Top Customers Chart</FormLabel>
                  <FormDescription>
                    Show the donut chart of your top paying customers.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="showTaxCards"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Tax & Stats Summary</FormLabel>
                  <FormDescription>
                    Show GST collected, TDS deducted, and other summary metric cards.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="showQuickActions"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Quick Actions</FormLabel>
                  <FormDescription>
                    Show quick action buttons (New Invoice, New Quotation, etc.) at the top of the dashboard.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="showRecentInvoices"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Recent Invoices</FormLabel>
                  <FormDescription>
                    Show a compact list of your 5 most recently created invoices.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="showRecentQuotations"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Recent Quotations</FormLabel>
                  <FormDescription>
                    Show a compact list of your 5 most recently created quotations.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="showRecentExpenses"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Recent Expenses</FormLabel>
                  <FormDescription>
                    Show a compact list of your 5 most recently recorded expenses.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </form>
    </Form>
  )
}
