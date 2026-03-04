"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createCompetency,
  deleteCompetency,
  upsertEmployeeCompetency,
} from "@/actions/features.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Star, Trash2, Loader2, Award, ChevronDown, ChevronUp, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const RATING_LABELS = ["", "Beginner", "Basic", "Intermediate", "Advanced", "Expert"];
const RATING_COLORS = ["", "bg-red-100 text-red-600", "bg-orange-100 text-orange-600", "bg-yellow-100 text-yellow-600", "bg-blue-100 text-blue-600", "bg-green-100 text-green-600"];

type Competency = {
  id: string; name: string; description: string | null; category: string | null;
  _count: { employeeCompetencies: number };
};
type EC = {
  id: string; rating: number; notes: string | null;
  employee: { id: string; firstName: string; lastName: string; avatar: string | null; department: { name: string } | null };
  competency: { id: string; name: string; category: string | null };
};
type Employee = { id: string; firstName: string; lastName: string };

type Props = {
  competencies: Competency[];
  employeeCompetencies: EC[];
  employees: Employee[];
  isHR: boolean;
  currentEmployeeId?: string;
  organizationId: string;
};

export function CompetenciesClient({ competencies, employeeCompetencies, employees, isHR, currentEmployeeId }: Props) {
  const router = useRouter();
  const [tab, setTab]               = useState<"matrix" | "library">("matrix");
  const [loading, setLoading]       = useState(false);
  const [showAddComp, setShowAddComp]   = useState(false);
  const [showRateForm, setShowRateForm] = useState(false);
  const [deletingId, setDeletingId]     = useState<string | null>(null);
  const [expandedEmp, setExpandedEmp]   = useState<string | null>(null);
  const [compForm, setCompForm]     = useState({ name: "", description: "", category: "" });
  const [rateForm, setRateForm]     = useState({ employeeId: "", competencyId: "", rating: "3", notes: "" });

  const byEmployee = employeeCompetencies.reduce<Record<string, EC[]>>((acc, ec) => {
    const k = ec.employee.id;
    if (!acc[k]) acc[k] = [];
    acc[k].push(ec);
    return acc;
  }, {});

  const byCategory = competencies.reduce<Record<string, Competency[]>>((acc, c) => {
    const k = c.category ?? "General";
    if (!acc[k]) acc[k] = [];
    acc[k].push(c);
    return acc;
  }, {});

  const myECs = currentEmployeeId ? (byEmployee[currentEmployeeId] ?? []) : [];
  const matrixEntries = isHR ? Object.entries(byEmployee) : currentEmployeeId && myECs.length > 0 ? [[currentEmployeeId, myECs]] as [string, EC[]][] : [];

  async function handleAddCompetency(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await createCompetency({ name: compForm.name, description: compForm.description || undefined, category: compForm.category || undefined });
    setLoading(false);
    setShowAddComp(false);
    setCompForm({ name: "", description: "", category: "" });
    router.refresh();
  }

  async function handleDelete(id: string) {
    setLoading(true);
    await deleteCompetency(id);
    setLoading(false);
    setDeletingId(null);
    router.refresh();
  }

  async function handleRate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await upsertEmployeeCompetency({ employeeId: rateForm.employeeId, competencyId: rateForm.competencyId, rating: Number(rateForm.rating), notes: rateForm.notes || undefined });
    setLoading(false);
    setShowRateForm(false);
    setRateForm({ employeeId: "", competencyId: "", rating: "3", notes: "" });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Skills & Competencies</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track and assess employee skills across your organisation</p>
        </div>
        {isHR && (
          <div className="flex gap-2">
            <Button variant="outline" className="border-slate-200" onClick={() => setShowAddComp(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Add Skill
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowRateForm(true)}>
              <Star className="w-4 h-4 mr-1.5" /> Rate Employee
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Skills",     value: competencies.length,            color: "bg-blue-50 text-blue-700" },
          { label: "Assessments",      value: employeeCompetencies.length,    color: "bg-violet-50 text-violet-700" },
          { label: "Employees Rated",  value: Object.keys(byEmployee).length, color: "bg-green-50 text-green-700" },
        ].map((s) => (
          <div key={s.label} className={cn("rounded-xl p-4", s.color)}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium mt-0.5 opacity-70">{s.label}</p>
          </div>
        ))}
      </div>

      {isHR && (
        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
          {[{ key: "matrix", label: "Employee Matrix" }, { key: "library", label: "Skills Library" }].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={cn("px-4 py-1.5 rounded-lg text-xs font-semibold transition-all",
                tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}>{t.label}</button>
          ))}
        </div>
      )}

      {/* Add Skill Form */}
      {showAddComp && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Add New Skill</h3>
          <form onSubmit={handleAddCompetency} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Skill Name *</Label>
                <Input value={compForm.name} onChange={(e) => setCompForm(p => ({ ...p, name: e.target.value }))} required className="border-slate-200" placeholder="e.g. React.js" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</Label>
                <Input value={compForm.category} onChange={(e) => setCompForm(p => ({ ...p, category: e.target.value }))} className="border-slate-200" placeholder="e.g. Technical, Leadership" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</Label>
                <Input value={compForm.description} onChange={(e) => setCompForm(p => ({ ...p, description: e.target.value }))} className="border-slate-200" placeholder="Optional" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="border-slate-200" onClick={() => setShowAddComp(false)}>Cancel</Button>
              <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Skill"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Rate Employee Form */}
      {showRateForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Rate Employee Skill</h3>
          <form onSubmit={handleRate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Employee *</Label>
                <Select value={rateForm.employeeId} onValueChange={(v) => setRateForm(p => ({ ...p, employeeId: v }))}>
                  <SelectTrigger className="border-slate-200"><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Skill *</Label>
                <Select value={rateForm.competencyId} onValueChange={(v) => setRateForm(p => ({ ...p, competencyId: v }))}>
                  <SelectTrigger className="border-slate-200"><SelectValue placeholder="Select skill" /></SelectTrigger>
                  <SelectContent>{competencies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}{c.category ? ` (${c.category})` : ""}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Proficiency Level</Label>
              <div className="grid grid-cols-5 gap-2">
                {[1,2,3,4,5].map((r) => (
                  <button key={r} type="button" onClick={() => setRateForm(p => ({ ...p, rating: String(r) }))}
                    className={cn("py-2.5 rounded-xl text-xs font-semibold border-2 transition-all",
                      rateForm.rating === String(r) ? RATING_COLORS[r] + " border-current" : "border-slate-200 text-slate-500 hover:border-slate-300"
                    )}
                  >{r} — {RATING_LABELS[r]}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</Label>
              <Input value={rateForm.notes} onChange={(e) => setRateForm(p => ({ ...p, notes: e.target.value }))} className="border-slate-200" placeholder="Assessment notes (optional)" />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="border-slate-200" onClick={() => setShowRateForm(false)}>Cancel</Button>
              <Button type="submit" disabled={loading || !rateForm.employeeId || !rateForm.competencyId} className="bg-blue-600 hover:bg-blue-700 text-white">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Rating"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Matrix View */}
      {(tab === "matrix" || !isHR) && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {matrixEntries.length === 0 ? (
            <div className="py-16 text-center">
              <Award className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No skill ratings yet</p>
              {isHR && <p className="text-slate-300 text-xs mt-1">Use "Rate Employee" to add assessments</p>}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {matrixEntries.map(([empId, ecs]) => {
                const emp = ecs[0]?.employee;
                const isExpanded = expandedEmp === empId;
                const avg = (ecs.reduce((s, e) => s + e.rating, 0) / ecs.length).toFixed(1);
                return (
                  <div key={empId}>
                    <button onClick={() => setExpandedEmp(isExpanded ? null : empId)}
                      className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        {emp?.avatar ? <img src={emp.avatar} className="w-9 h-9 rounded-full object-cover" alt="" /> : (
                          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                            {emp?.firstName[0]}{emp?.lastName[0]}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{emp?.firstName} {emp?.lastName}</p>
                          <p className="text-xs text-slate-400">{emp?.department?.name ?? "—"} · {ecs.length} skills rated · avg {avg}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {ecs.slice(0,4).map((ec) => (
                            <span key={ec.id} className={cn("text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center", RATING_COLORS[ec.rating])}>{ec.rating}</span>
                          ))}
                          {ecs.length > 4 && <span className="text-xs text-slate-400">+{ecs.length-4}</span>}
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-5 pb-4 grid grid-cols-2 md:grid-cols-3 gap-2 border-t border-slate-50">
                        {ecs.map((ec) => (
                          <div key={ec.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                            <div>
                              <p className="text-xs font-semibold text-slate-700">{ec.competency.name}</p>
                              <p className="text-[10px] text-slate-400">{ec.competency.category ?? "General"}</p>
                              {ec.notes && <p className="text-[10px] text-slate-400 mt-0.5 italic">{ec.notes}</p>}
                            </div>
                            <span className={cn("text-xs font-bold px-2 py-1 rounded-full ml-2 shrink-0", RATING_COLORS[ec.rating])}>{RATING_LABELS[ec.rating]}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Skills Library */}
      {tab === "library" && isHR && (
        <div className="space-y-3">
          {Object.keys(byCategory).length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
              <Award className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No skills defined yet</p>
            </div>
          ) : (
            Object.entries(byCategory).map(([category, comps]) => (
              <div key={category} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{category}</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {comps.map((c) => (
                    <div key={c.id} className="flex items-center justify-between px-5 py-3.5">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                        {c.description && <p className="text-xs text-slate-400">{c.description}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">{c._count.employeeCompetencies} rated</span>
                        {deletingId === c.id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-500">Delete?</span>
                            <button onClick={() => handleDelete(c.id)} disabled={loading} className="p-1 hover:bg-red-50 rounded text-red-500"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setDeletingId(null)} className="p-1 hover:bg-slate-100 rounded text-slate-400"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        ) : (
                          <button onClick={() => setDeletingId(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
