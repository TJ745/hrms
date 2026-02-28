"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAnnouncement } from "@/actions/announcement.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowLeft } from "lucide-react";
import type { AnnouncementAudience } from "@prisma/client";

type Props = {
  organizationId: string;
  branches:       { id: string; name: string }[];
  departments:    { id: string; name: string }[];
  orgSlug:        string;
};

export function NewAnnouncementForm({ organizationId, branches, departments, orgSlug }: Props) {
  const router = useRouter();
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [audience,  setAudience]  = useState<AnnouncementAudience>("ALL");
  const [form, setForm] = useState({
    title:        "",
    content:      "",
    branchId:     "",
    departmentId: "",
    isPinned:     false,
    publishedAt:  "",
    expiresAt:    "",
  });

  function set(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await createAnnouncement({
      organizationId,
      audience,
      title:        form.title,
      content:      form.content,
      branchId:     audience === "BRANCH"     ? form.branchId     || undefined : undefined,
      departmentId: audience === "DEPARTMENT" ? form.departmentId || undefined : undefined,
      isPinned:     form.isPinned,
      publishedAt:  form.publishedAt || undefined,
      expiresAt:    form.expiresAt   || undefined,
    });

    setLoading(false);
    if (!result.success) { setError(result.error); return; }
    router.push(`/${orgSlug}/announcements`);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">

      {/* Title */}
      <div className="space-y-1.5">
        <Label className="text-slate-700 text-sm font-medium">Title *</Label>
        <Input
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          required
          placeholder="e.g. Office Closure – Public Holiday"
          className="border-slate-200"
        />
      </div>

      {/* Content */}
      <div className="space-y-1.5">
        <Label className="text-slate-700 text-sm font-medium">Content *</Label>
        <Textarea
          value={form.content}
          onChange={(e) => set("content", e.target.value)}
          required
          rows={6}
          placeholder="Write the full announcement text..."
          className="border-slate-200 resize-none"
        />
      </div>

      {/* Audience */}
      <div className="space-y-1.5">
        <Label className="text-slate-700 text-sm font-medium">Audience *</Label>
        <Select value={audience} onValueChange={(v) => setAudience(v as AnnouncementAudience)}>
          <SelectTrigger className="border-slate-200"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Everyone (Company-wide)</SelectItem>
            <SelectItem value="BRANCH">Specific Branch</SelectItem>
            <SelectItem value="DEPARTMENT">Specific Department</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Branch selector */}
      {audience === "BRANCH" && (
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-sm font-medium">Branch</Label>
          <Select value={form.branchId || "NONE"} onValueChange={(v) => set("branchId", v === "NONE" ? "" : v)}>
            <SelectTrigger className="border-slate-200"><SelectValue placeholder="Select branch" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">All branches</SelectItem>
              {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Department selector */}
      {audience === "DEPARTMENT" && (
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-sm font-medium">Department</Label>
          <Select value={form.departmentId || "NONE"} onValueChange={(v) => set("departmentId", v === "NONE" ? "" : v)}>
            <SelectTrigger className="border-slate-200"><SelectValue placeholder="Select department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">All departments</SelectItem>
              {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Schedule */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-sm font-medium">Publish Date</Label>
          <Input type="datetime-local" value={form.publishedAt} onChange={(e) => set("publishedAt", e.target.value)} className="border-slate-200 text-sm" />
          <p className="text-xs text-slate-400">Leave blank to publish immediately</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-sm font-medium">Expiry Date</Label>
          <Input type="datetime-local" value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} className="border-slate-200 text-sm" />
          <p className="text-xs text-slate-400">Leave blank to never expire</p>
        </div>
      </div>

      {/* Pin */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="pinned"
          checked={form.isPinned}
          onCheckedChange={(v) => set("isPinned", !!v)}
        />
        <Label htmlFor="pinned" className="text-slate-700 text-sm cursor-pointer">
          Pin this announcement (shows at the top)
        </Label>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="border-slate-200" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
        </Button>
        <Button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publish Announcement"}
        </Button>
      </div>
    </form>
  );
}
