"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePerformanceReview } from "@/actions/performance.actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Star, CheckCircle, Edit2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReviewStatus } from "@prisma/client";

type Props = {
  review: {
    id:           string;
    status:       ReviewStatus;
    rating:       number | null;
    strengths:    string | null;
    improvements: string | null;
    comments:     string | null;
  };
  organizationId: string;
  canEdit:        boolean;
  orgSlug:        string;
};

export function ReviewEditor({ review, organizationId, canEdit }: Props) {
  const router = useRouter();
  const [editing,  setEditing]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [rating,   setRating]   = useState(review.rating ?? 0);
  const [hovered,  setHovered]  = useState(0);
  const [form, setForm] = useState({
    strengths:    review.strengths    ?? "",
    improvements: review.improvements ?? "",
    comments:     review.comments     ?? "",
  });

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave(newStatus?: ReviewStatus) {
    setError("");
    setLoading(true);
    const result = await updatePerformanceReview({
      reviewId:       review.id,
      organizationId,
      rating:         rating || undefined,
      strengths:      form.strengths    || undefined,
      improvements:   form.improvements || undefined,
      comments:       form.comments     || undefined,
      status:         newStatus,
    });
    setLoading(false);
    if (!result.success) { setError("Failed to save review"); return; }
    setEditing(false);
    router.refresh();
  }

  const isCompleted = review.status === "COMPLETED";

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-slate-800 text-sm">Review Assessment</h3>
        {canEdit && !isCompleted && !editing && (
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-600 -mr-2" onClick={() => setEditing(true)}>
            <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
          </Button>
        )}
        {editing && (
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-600 -mr-2" onClick={() => setEditing(false)}>
            <X className="w-3.5 h-3.5 mr-1.5" /> Cancel
          </Button>
        )}
      </div>

      {/* Star rating */}
      <div className="mb-5">
        <Label className="text-slate-600 text-xs font-semibold uppercase tracking-wide mb-2 block">Overall Rating</Label>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              disabled={!editing}
              onClick={() => editing && setRating(star)}
              onMouseEnter={() => editing && setHovered(star)}
              onMouseLeave={() => editing && setHovered(0)}
              className={cn("transition-all", editing ? "cursor-pointer hover:scale-110" : "cursor-default")}
            >
              <Star
                className={cn(
                  "w-7 h-7 transition-colors",
                  star <= (hovered || rating)
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-slate-200 fill-slate-200"
                )}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-sm font-semibold text-slate-600">
              {["", "Poor", "Below Average", "Average", "Good", "Excellent"][rating]}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <Field
          label="Strengths"
          value={editing ? form.strengths : (review.strengths ?? "")}
          onChange={(v) => set("strengths", v)}
          editing={editing}
          placeholder="What did this employee do well?"
        />
        <Field
          label="Areas for Improvement"
          value={editing ? form.improvements : (review.improvements ?? "")}
          onChange={(v) => set("improvements", v)}
          editing={editing}
          placeholder="What can this employee improve on?"
        />
        <Field
          label="Overall Comments"
          value={editing ? form.comments : (review.comments ?? "")}
          onChange={(v) => set("comments", v)}
          editing={editing}
          placeholder="General comments and summary..."
        />
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {editing && (
        <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100">
          <Button
            variant="outline"
            className="flex-1 border-slate-200 text-slate-600"
            disabled={loading}
            onClick={() => handleSave("IN_PROGRESS")}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Draft"}
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            disabled={loading || !rating}
            onClick={() => handleSave("COMPLETED")}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-1.5" /> Complete Review</>}
          </Button>
        </div>
      )}

      {isCompleted && (
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-sm text-green-600 font-medium">
          <CheckCircle className="w-4 h-4" /> Review completed
        </div>
      )}
    </div>
  );
}

function Field({
  label, value, onChange, editing, placeholder,
}: {
  label:       string;
  value:       string;
  onChange:    (v: string) => void;
  editing:     boolean;
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-slate-600 text-xs font-semibold uppercase tracking-wide">{label}</Label>
      {editing ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="border-slate-200 text-sm resize-none"
        />
      ) : (
        <p className={cn("text-sm leading-relaxed", value ? "text-slate-700" : "text-slate-300 italic")}>
          {value || `No ${label.toLowerCase()} added yet`}
        </p>
      )}
    </div>
  );
}
