"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDisciplinaryRecord, deleteDisciplinaryRecord } from "@/actions/hr-operations.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPES = ["WARNING", "WRITTEN_WARNING", "SUSPENSION", "PIP", "TERMINATION"];
const TYPE_STYLES: Record<string, string> = {
  WARNING:         "bg-yellow-100 text-yellow-700",
  WRITTEN_WARNING: "bg-orange-100 text-orange-700",
  SUSPENSION:      "bg-red-100 text-red-700",
  PIP:             "bg-purple-100 text-purple-700",
  TERMINATION:     "bg-red-200 text-red-800",
};

type Props = {
  records:        any[];
  employees:      { id: string; firstName: string; lastName: string; employeeCode: string }[];
  organizationId: string;
  orgSlug:        string;
};

export function DisciplinaryClient({ records, employees, organizationId, orgSlug }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [filter,   setFilter]   = useState("ALL");
  const [form, setForm] = useState({
    employeeId: "", type: "WARNING", reason: "", description: "",
    issuedAt: new Date().toISOString().split("T")[0], expiresAt: "",
  });

  const filtered = filter === "ALL" ? records : records.filter((r: any) => r.type === filter);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await createDisciplinaryRecord({
      employeeId:    form.employeeId,
      organizationId,
      type:          form.type,
      reason:        form.reason,
      description:   form.description || undefined,
      issuedAt:      form.issuedAt,
      expiresAt:     form.expiresAt || undefined,
    });
    setLoading(false);
    setShowForm(false);
    setForm({ employeeId: "", type: "WARNING", reason: "", description: "", issuedAt: new Date().toISOString().split("T")[0], expiresAt: "" });
    router.refresh();
  }

  async function handleDelete(recordId: string) {
    if (!confirm("Delete this disciplinary record? This action cannot be undone.")) return;
    setLoading(true);
    await deleteDisciplinaryRecord(recordId);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Disciplinary Records</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage warnings, suspensions and performance improvement plans</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-1.5" /> New Record
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Issue Disciplinary Notice</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Employee *</Label>
                <Select value={form.employeeId} onValueChange={(v) => setForm((p) => ({ ...p, employeeId: v }))}>
                  <SelectTrigger className="border-slate-200"><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeCode})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Type *</Label>
                <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                  <SelectTrigger className="border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_"," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reason *</Label>
                <Input value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} required placeholder="State the reason clearly" className="border-slate-200" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</Label>
                <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Detailed description of the incident..." className="border-slate-200" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Issue Date *</Label>
                <Input type="date" value={form.issuedAt} onChange={(e) => setForm((p) => ({ ...p, issuedAt: e.target.value }))} required className="border-slate-200" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expires On</Label>
                <Input type="date" value={form.expiresAt} onChange={(e) => setForm((p) => ({ ...p, expiresAt: e.target.value }))} className="border-slate-200" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="border-slate-200" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={loading || !form.employeeId} className="bg-blue-600 hover:bg-blue-700 text-white">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Issue Notice"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Filter */}
      <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
        {["ALL", ...TYPES].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-all", filter === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Records */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ShieldAlert className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No disciplinary records found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((r: any) => {
              const isExpired = r.expiresAt && new Date(r.expiresAt) < new Date();
              return (
                <div key={r.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", TYPE_STYLES[r.type] ?? "bg-slate-100")}>
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800">{r.employee.firstName} {r.employee.lastName}</p>
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", TYPE_STYLES[r.type] ?? "bg-slate-100 text-slate-500")}>{r.type.replace("_"," ")}</span>
                        {isExpired && <span className="text-[10px] font-semibold bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">EXPIRED</span>}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{r.reason}</p>
                      {r.description && <p className="text-xs text-slate-400 mt-0.5">{r.description}</p>}
                      <p className="text-xs text-slate-400 mt-0.5">
                        Issued: {new Date(r.issuedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {r.expiresAt && ` · Expires: ${new Date(r.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(r.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
