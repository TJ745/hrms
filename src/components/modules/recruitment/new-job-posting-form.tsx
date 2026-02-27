"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createJobPosting } from "@/actions/recruitment.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowLeft } from "lucide-react";

type Props = {
  organizationId: string;
  departments:    { id: string; name: string }[];
  branches:       { id: string; name: string }[];
  orgSlug:        string;
};

export function NewJobPostingForm({ organizationId, departments, branches, orgSlug }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [form, setForm] = useState({
    title:            "",
    description:      "",
    requirements:     "",
    responsibilities: "",
    type:             "FULL_TIME",
    location:         "",
    isRemote:         false,
    salaryMin:        "",
    salaryMax:        "",
    currency:         "USD",
    openings:         "1",
    deadline:         "",
    experienceMin:    "",
    experienceMax:    "",
    departmentId:     "",
    branchId:         "",
  });

  function set(field: string, value: string | boolean) {
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
      requirements:     form.requirements     || undefined,
      responsibilities: form.responsibilities  || undefined,
      type:             form.type,
      location:         form.location          || undefined,
      isRemote:         form.isRemote,
      salaryMin:        form.salaryMin ? parseFloat(form.salaryMin) : undefined,
      salaryMax:        form.salaryMax ? parseFloat(form.salaryMax) : undefined,
      currency:         form.currency,
      openings:         parseInt(form.openings) || 1,
      deadline:         form.deadline          || undefined,
      experienceMin:    form.experienceMin ? parseInt(form.experienceMin) : undefined,
      experienceMax:    form.experienceMax ? parseInt(form.experienceMax) : undefined,
      departmentId:     form.departmentId      || undefined,
      branchId:         form.branchId          || undefined,
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

      {/* Department + Branch */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-sm font-medium">Department</Label>
          <Select value={form.departmentId || "NONE"} onValueChange={(v) => set("departmentId", v === "NONE" ? "" : v)}>
            <SelectTrigger className="border-slate-200"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">No department</SelectItem>
              {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-sm font-medium">Branch</Label>
          <Select value={form.branchId || "NONE"} onValueChange={(v) => set("branchId", v === "NONE" ? "" : v)}>
            <SelectTrigger className="border-slate-200"><SelectValue placeholder="All branches" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">All branches</SelectItem>
              {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Type + Openings + Deadline */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-sm font-medium">Employment Type *</Label>
          <Select value={form.type} onValueChange={(v) => set("type", v)}>
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
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-sm font-medium">Openings *</Label>
          <Input type="number" min="1" value={form.openings} onChange={(e) => set("openings", e.target.value)} required className="border-slate-200" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-sm font-medium">Deadline</Label>
          <Input type="date" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} className="border-slate-200" />
        </div>
      </div>

      {/* Location + Remote */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-sm font-medium">Location</Label>
          <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. New York, NY" className="border-slate-200" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-sm font-medium">Experience (years)</Label>
          <div className="flex gap-2">
            <Input type="number" min="0" value={form.experienceMin} onChange={(e) => set("experienceMin", e.target.value)} placeholder="Min" className="border-slate-200" />
            <Input type="number" min="0" value={form.experienceMax} onChange={(e) => set("experienceMax", e.target.value)} placeholder="Max" className="border-slate-200" />
          </div>
        </div>
      </div>

      {/* Remote toggle */}
      <div className="flex items-center gap-2">
        <Checkbox id="remote" checked={form.isRemote} onCheckedChange={(v) => set("isRemote", !!v)} />
        <Label htmlFor="remote" className="text-slate-700 text-sm cursor-pointer">Remote position</Label>
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

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="border-slate-200" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
        </Button>
        <Button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post Job"}
        </Button>
      </div>
    </form>
  );
}
