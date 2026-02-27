"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createApplication } from "@/actions/recruitment.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserPlus, ChevronDown } from "lucide-react";

type Props = { jobPostingId: string; organizationId: string; orgSlug: string };

export function AddApplicantForm({ jobPostingId, organizationId, orgSlug }: Props) {
  const router  = useRouter();
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [form, setForm] = useState({
    firstName:   "",
    lastName:    "",
    email:       "",
    phone:       "",
    resumeUrl:   "",
    coverLetter: "",
    source:      "REFERRAL",
    notes:       "",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await createApplication({
      jobPostingId,
      firstName:   form.firstName,
      lastName:    form.lastName,
      email:       form.email,
      phone:       form.phone       || undefined,
      resumeUrl:   form.resumeUrl   || undefined,
      coverLetter: form.coverLetter || undefined,
      source:      form.source,
      notes:       form.notes       || undefined,
    });

    setLoading(false);
    if (!result.success) { setError(result.error); return; }
    setOpen(false);
    router.push(`/${orgSlug}/recruitment/applicants/${result.data.id}`);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <UserPlus className="w-4 h-4 text-slate-400" /> Add Applicant Manually
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-3 border-t border-slate-100">
          <div className="grid grid-cols-2 gap-3 pt-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">First Name *</Label>
              <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} required className="h-9 border-slate-200 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Last Name *</Label>
              <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} required className="h-9 border-slate-200 text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">Email *</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required className="h-9 border-slate-200 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Phone</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="h-9 border-slate-200 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Source</Label>
              <Select value={form.source} onValueChange={(v) => set("source", v)}>
                <SelectTrigger className="h-9 border-slate-200 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="REFERRAL">Referral</SelectItem>
                  <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                  <SelectItem value="INDEED">Indeed</SelectItem>
                  <SelectItem value="DIRECT">Direct</SelectItem>
                  <SelectItem value="AGENCY">Agency</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">Resume URL</Label>
            <Input value={form.resumeUrl} onChange={(e) => set("resumeUrl", e.target.value)} placeholder="https://..." className="h-9 border-slate-200 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">Notes</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} className="border-slate-200 text-sm resize-none" placeholder="Internal notes about this candidate..." />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-9 text-sm">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add Applicant"}
          </Button>
        </form>
      )}
    </div>
  );
}
