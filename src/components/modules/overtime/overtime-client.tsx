"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createOvertimePolicy, updateOvertimePolicy, deleteOvertimePolicy } from "@/actions/features.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Clock, Pencil, Trash2, X, Loader2, Check, Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Policy = { id: string; name: string; rateMultiplier: number; afterHours: number; maxHoursPerDay: number | null; isDefault: boolean; createdAt: string };
type Props  = { policies: Policy[]; organizationId: string; orgSlug: string };

const empty = { name: "", rateMultiplier: "1.5", afterHours: "8", maxHoursPerDay: "", isDefault: false };

export function OvertimeClient({ policies, organizationId }: Props) {
  const router = useRouter();
  const [loading,   setLoading]   = useState(false);
  const [showForm,  setShowForm]  = useState(false);
  const [editing,   setEditing]   = useState<Policy | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);

  function openCreate() { setEditing(null); setForm(empty); setShowForm(true); }
  function openEdit(p: Policy) { setEditing(p); setForm({ name: p.name, rateMultiplier: p.rateMultiplier.toString(), afterHours: p.afterHours.toString(), maxHoursPerDay: p.maxHoursPerDay?.toString() ?? "", isDefault: p.isDefault }); setShowForm(true); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    if (editing) {
      await updateOvertimePolicy({ policyId: editing.id, organizationId, name: form.name, rateMultiplier: Number(form.rateMultiplier), afterHours: Number(form.afterHours), maxHoursPerDay: form.maxHoursPerDay ? Number(form.maxHoursPerDay) : undefined, isDefault: form.isDefault });
    } else {
      await createOvertimePolicy({ organizationId, name: form.name, rateMultiplier: Number(form.rateMultiplier), afterHours: Number(form.afterHours), maxHoursPerDay: form.maxHoursPerDay ? Number(form.maxHoursPerDay) : undefined, isDefault: form.isDefault });
    }
    setLoading(false); setShowForm(false); router.refresh();
  }

  async function handleDelete(id: string) { setLoading(true); await deleteOvertimePolicy(id); setLoading(false); setDeletingId(null); router.refresh(); }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Overtime Policies</h1>
          <p className="text-sm text-slate-500 mt-0.5">Define overtime rules and pay multipliers for payroll calculations</p>
        </div>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white"><Plus className="w-4 h-4 mr-1.5" />New Policy</Button>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
        <Clock className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800">How overtime policies work</p>
          <p className="text-xs text-blue-600 mt-0.5">Policies define when overtime begins (after X hours/day) and the pay multiplier (e.g. 1.5× = time and a half). The default policy applies to all employees unless overridden.</p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">{editing ? "Edit Policy" : "New Overtime Policy"}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Policy Name *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required className="border-slate-200" placeholder="e.g. Standard Overtime, Night Overtime" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Starts After (hrs/day) *</Label>
                <Input type="number" step="0.5" min="1" value={form.afterHours} onChange={e => setForm(p => ({ ...p, afterHours: e.target.value }))} required className="border-slate-200" placeholder="8" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pay Multiplier *</Label>
                <Input type="number" step="0.25" min="1" max="5" value={form.rateMultiplier} onChange={e => setForm(p => ({ ...p, rateMultiplier: e.target.value }))} required className="border-slate-200" placeholder="1.5" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Max Hours/Day</Label>
                <Input type="number" step="0.5" min="1" value={form.maxHoursPerDay} onChange={e => setForm(p => ({ ...p, maxHoursPerDay: e.target.value }))} className="border-slate-200" placeholder="Optional cap" />
              </div>
            </div>

            {/* Preview */}
            {form.afterHours && form.rateMultiplier && (
              <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600">
                <strong>Preview:</strong> Overtime begins after <strong>{form.afterHours}h/day</strong> at <strong>{Number(form.rateMultiplier)}×</strong> normal rate
                {form.maxHoursPerDay ? `, capped at ${form.maxHoursPerDay}h/day` : ""}.
                If an employee's hourly rate is $20, overtime pays <strong>${(20 * Number(form.rateMultiplier)).toFixed(2)}/hr</strong>.
              </div>
            )}

            <div className="flex items-center gap-2">
              <input type="checkbox" id="def" checked={form.isDefault} onChange={e => setForm(p => ({ ...p, isDefault: e.target.checked }))} className="rounded" />
              <label htmlFor="def" className="text-sm font-medium text-slate-700">Set as default policy for all employees</label>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="border-slate-200" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? "Save Changes" : "Create Policy"}</Button>
            </div>
          </form>
        </div>
      )}

      {/* Policies list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {policies.length === 0 ? (
          <div className="py-16 text-center"><Clock className="w-10 h-10 text-slate-200 mx-auto mb-3" /><p className="text-slate-400 text-sm">No overtime policies yet</p><p className="text-slate-300 text-xs mt-1">Create your first policy above</p></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {policies.map((p) => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", p.isDefault ? "bg-amber-50" : "bg-slate-50")}>
                  <Clock className={cn("w-5 h-5", p.isDefault ? "text-amber-500" : "text-slate-400")} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                    {p.isDefault && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Star className="w-2.5 h-2.5" />DEFAULT</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    After <strong>{p.afterHours}h</strong> per day → <strong>{p.rateMultiplier}×</strong> rate
                    {p.maxHoursPerDay ? ` · Max ${p.maxHoursPerDay}h/day` : ""}
                  </p>
                </div>
                {/* Visual multiplier indicator */}
                <div className="hidden md:flex items-center gap-1.5 shrink-0">
                  <div className="bg-slate-100 rounded-full h-2 w-20">
                    <div className="bg-amber-400 h-2 rounded-full" style={{ width: `${Math.min(100, ((p.rateMultiplier - 1) / 2) * 100)}%` }} />
                  </div>
                  <span className="text-xs font-bold text-amber-600">{p.rateMultiplier}×</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-slate-100"><Pencil className="w-3.5 h-3.5 text-slate-400" /></button>
                  {deletingId === p.id ? (
                    <div className="flex gap-1">
                      <button onClick={() => handleDelete(p.id)} disabled={loading} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeletingId(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <button onClick={() => setDeletingId(p.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
