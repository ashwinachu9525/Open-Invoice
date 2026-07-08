"use client";

import { useState } from "react";
import { addComment } from "@/app/actions/feature-requests";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Loader2, ImagePlus, X, SendHorizontal } from "lucide-react";
import Image from "next/image";

export function CommentsSection({ 
  featureRequestId, 
  comments 
}: { 
  featureRequestId: string;
  comments: any[];
}) {
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      let imageUrl = undefined;
      
      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error("Failed to upload image");
        const data = await res.json();
        imageUrl = data.url;
      }

      await addComment(featureRequestId, content, imageUrl);
      setContent("");
      setImageFile(null);
      toast.success("Comment added");
    } catch (e: any) {
      toast.error(e.message || "Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 mt-8">
      <h3 className="text-lg font-semibold">Comments ({comments.length})</h3>
      
      <div className="space-y-4">
        {comments.map(comment => (
          <div key={comment.id} className="p-4 rounded-xl border bg-card/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-xs">
                {comment.user?.name?.[0] || comment.user?.email?.[0] || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium flex items-center gap-2">
                  {comment.user?.name || comment.user?.email || "Unknown User"}
                  {comment.user?.role === "SUPER_ADMIN" && (
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Admin</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
            
            <div className="text-sm whitespace-pre-wrap mb-3">{comment.content}</div>
            
            {comment.imageUrl && (
              <div className="relative w-full max-w-sm h-48 rounded-lg overflow-hidden border mt-2">
                <Image src={comment.imageUrl} alt="Comment attachment" fill className="object-cover" />
              </div>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="border rounded-xl p-4 bg-card/30">
        <Textarea
          placeholder="Add a comment..."
          value={content}
          onChange={e => setContent(e.target.value)}
          className="min-h-[100px] mb-4 bg-transparent border-none focus-visible:ring-0 px-0 resize-none"
        />
        
        {imageFile && (
          <div className="relative w-20 h-20 rounded-md overflow-hidden border mb-4">
            <Image 
              src={URL.createObjectURL(imageFile)} 
              alt="Preview" 
              fill 
              className="object-cover"
            />
            <button 
              type="button"
              className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/80"
              onClick={() => setImageFile(null)}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-4">
          <label className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            <ImagePlus className="w-4 h-4" />
            <span>Attach Image</span>
            <input 
              type="file" 
              className="hidden" 
              accept="image/*"
              onChange={(e) => {
                if (e.target.files?.[0]) setImageFile(e.target.files[0]);
              }}
            />
          </label>

          <Button type="submit" disabled={isSubmitting || !content.trim()} size="sm" className="gap-2">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizontal className="w-4 h-4" />}
            Comment
          </Button>
        </div>
      </form>
    </div>
  );
}
