"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createJobPosting } from "@/actions/recruitment.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft } from "lucide-react";
import type { EmploymentType } from "@prisma/client";

type Props = {
  organizationId: string;
  positions:      { id: string; title: string }[];
  orgSlug:        string;
};

export function NewJobPostingForm({ organizationId, positions, orgSlug }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [form, setForm] = useState({
    title:            "",
    description:      "",
    requirements:     "",
    responsibilities: "",
    employmentType:   "FULL_TIME" as EmploymentType,
    location:         "",
    salaryMin:        "",
    salaryMax:        "",
    currency:         "USD",
    openings:         "1",
    deadline:         "",
    positionId:       "",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await createJobPosting({
      organizationId,
      title:            form.title,
      description:      form.description,
      requirements:     form.requirements      || undefined,
      responsibilities: form.responsibilities  || undefined,
      employmentType:   form.employmentType,
      location:         form.location          || undefined,
      salaryMin:        form.salaryMin ? parseFloat(form.salaryMin) : undefined,
      salaryMax:        form.salaryMax ? parseFloat(form.salaryMax) : undefined,
      currency:         form.currency,
      openings:         parseInt(form.openings) || 1,
      deadline:         form.deadline          || undefined,
      positionId:       form.positionId        || undefined,
    });

    setLoading(false);
    if (!result.success) { setError(result.error); return; }
    router.push(`/${orgSlug}/recruitment/jobs/${result.data.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
      {/* Title */}
      <div className="space-y-1.5">
        <Label className="text-slate-700 text-sm font-medium">Job Title *</Label>
        <Input value={form.title} onChange={(e) => set("title", e.target.value)} required placeholder="e.g. Senior Frontend Developer" className="border-slate-200" />
      </div>

      {/* Position + Type */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-sm font-medium">Linked Position</Label>
          <Select value={form.positionId || "NONE"} onValueChange={(v) => set("positionId", v === "NONE" ? "" : v)}>
            <SelectTrigger className="border-slate-200"><SelectValue placeholder="Select position" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">No linked position</SelectItem>
              {positions.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-sm font-medium">Employment Type *</Label>
          <Select value={form.employmentType} onValueChange={(v) => set("employmentType", v)}>
            <SelectTrigger className="border-slate-200"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="FULL_TIME">Full Time</SelectItem>
              <SelectItem value="PART_TIME">Part Time</SelectItem>
              <SelectItem value="CONTRACT">Contract</SelectItem>
              <SelectItem value="INTERN">Internship</SelectItem>
              <SelectItem value="FREELANCE">Freelance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Openings + Deadline + Location */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-sm font-medium">Openings *</Label>
          <Input type="number" min="1" value={form.openings} onChange={(e) => set("openings", e.target.value)} required className="border-slate-200" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-sm font-medium">Deadline</Label>
          <Input type="date" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} className="border-slate-200" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-sm font-medium">Location</Label>
          <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. New York, NY" className="border-slate-200" />
        </div>
      </div>

      {/* Salary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-sm font-medium">Min Salary</Label>
          <Input type="number" value={form.salaryMin} onChange={(e) => set("salaryMin", e.target.value)} placeholder="50000" className="border-slate-200" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-sm font-medium">Max Salary</Label>
          <Input type="number" value={form.salaryMax} onChange={(e) => set("salaryMax", e.target.value)} placeholder="80000" className="border-slate-200" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-sm font-medium">Currency</Label>
          <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
            <SelectTrigger className="border-slate-200"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["USD","EUR","GBP","PKR","SAR","AED","INR","CAD","AUD"].map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label className="text-slate-700 text-sm font-medium">Job Description *</Label>
        <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} required rows={5} placeholder="Describe the role, team, and impact..." className="border-slate-200 resize-none" />
      </div>

      {/* Responsibilities */}
      <div className="space-y-1.5">
        <Label className="text-slate-700 text-sm font-medium">Responsibilities</Label>
        <Textarea value={form.responsibilities} onChange={(e) => set("responsibilities", e.target.value)} rows={4} placeholder="Key responsibilities..." className="border-slate-200 resize-none" />
      </div>

      {/* Requirements */}
      <div className="space-y-1.5">
        <Label className="text-slate-700 text-sm font-medium">Requirements</Label>
        <Textarea value={form.requirements} onChange={(e) => set("requirements", e.target.value)} rows={4} placeholder="Required skills and qualifications..." className="border-slate-200 resize-none" />
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="border-slate-200" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
        </Button>
        <Button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Job Posting"}
        </Button>
      </div>
    </form>
  );
}
