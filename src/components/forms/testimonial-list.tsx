"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { testimonialSchema, TestimonialFormValues } from "@/validations/profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { addTestimonial, deleteTestimonial } from "@/actions/profile"
import { toast } from "sonner"
import { Loader2, Trash2, Star } from "lucide-react"

interface Testimonial {
  id: string
  clientName: string
  clientRole: string | null
  content: string
  rating: number
  avatarUrl: string | null
}

interface TestimonialListProps {
  testimonials: Testimonial[]
}

export function TestimonialList({ testimonials }: TestimonialListProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const form = useForm<TestimonialFormValues>({
    resolver: zodResolver(testimonialSchema) as any,
    defaultValues: {
      clientName: "",
      clientRole: "",
      content: "",
      rating: 5,
      avatarUrl: "",
    },
  })

  async function onSubmit(data: TestimonialFormValues) {
    setIsAdding(true)
    const result = await addTestimonial(data)
    setIsAdding(false)

    if (result.success) {
      toast.success("Testimonial added")
      form.reset()
    } else {
      toast.error(result.error || "Failed to add testimonial")
    }
  }

  async function handleDelete(id: string) {
    setIsDeleting(id)
    const result = await deleteTestimonial(id)
    setIsDeleting(null)

    if (result.success) {
      toast.success("Testimonial deleted")
    } else {
      toast.error(result.error || "Failed to delete testimonial")
    }
  }

  return (
    <div className="space-y-8">
      {testimonials.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Existing Testimonials</h3>
          <div className="grid grid-cols-1 gap-4">
            {testimonials.map((t) => (
              <div key={t.id} className="p-4 bg-white/5 border border-white/10 rounded-xl relative group">
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                  onClick={() => handleDelete(t.id)}
                  disabled={isDeleting === t.id}
                >
                  {isDeleting === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold">{t.clientName}</p>
                    <p className="text-xs text-muted-foreground">{t.clientRole}</p>
                  </div>
                  <div className="flex items-center text-yellow-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < t.rating ? "fill-current" : "opacity-30"}`} />
                    ))}
                  </div>
                </div>
                <p className="text-sm italic text-slate-300">"{t.content}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4 border-t border-white/10 pt-6">
        <h3 className="text-lg font-medium">Add New Testimonial</h3>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control as any}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control as any}
                name="clientRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Role / Company</FormLabel>
                    <FormControl>
                      <Input placeholder="CEO at Acme Corp" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Testimonial Content *</FormLabel>
                  <FormControl>
                    <Textarea placeholder="They did an amazing job..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control as any}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rating (1-5)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={5} {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control as any}
                name="avatarUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Avatar URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" disabled={isAdding}>
              {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Testimonial
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
}
