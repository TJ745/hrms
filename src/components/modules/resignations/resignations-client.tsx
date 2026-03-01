"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitResignation, updateResignationStatus } from "@/actions/hr-operations.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, UserMinus, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  PENDING:   "bg-yellow-100 text-yellow-700",
  APPROVED:  "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  REJECTED:  "bg-red-100 text-red-600",
};

type Props = {
  resignations:      any[];
  isHR:              boolean;
  currentEmployeeId: string | null;
  organizationId:    string;
  orgSlug:           string;
};

export function ResignationsClient({ resignations, isHR, currentEmployeeId, organizationId, orgSlug }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [filter,   setFilter]   = useState("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [exitDone, setExitDone] = useState(false);
  const [form, setForm] = useState({
    resignationDate: "", lastWorkingDate: "", reason: "", notes: "",
  });

  const filtered = filter === "ALL" ? resignations : resignations.filter((r: any) => r.status === filter);

  // Has the current employee already submitted a resignation?
  const myResignation = resignations.find(
    (r: any) => r.employeeId === currentEmployeeId && ["PENDING", "APPROVED"].includes(r.status)
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentEmployeeId) return;
    setLoading(true);
    const result = await submitResignation({
      employeeId:      currentEmployeeId,
      organizationId,
      resignationDate: form.resignationDate,
      lastWorkingDate: form.lastWorkingDate,
      reason:          form.reason || undefined,
      notes:           form.notes  || undefined,
    });
    setLoading(false);
    if (result.success) {
      setShowForm(false);
      setForm({ resignationDate: "", lastWorkingDate: "", reason: "", notes: "" });
      router.refresh();
    }
  }

  async function handleAction(resignationId: string, status: string) {
    setLoading(true);
    await updateResignationStatus({
      resignationId,
      status:            status as any,
      organizationId,
      exitInterviewDone: status === "COMPLETED" ? exitDone : undefined,
    });
    setLoading(false);
    setUpdatingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Resignations</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isHR ? "Manage employee resignation requests" : "Submit your resignation notice"}
          </p>
        </div>
        {currentEmployeeId && !myResignation && (
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Submit Resignation
          </Button>
        )}
      </div>

      {/* My active resignation banner */}
      {myResignation && !isHR && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-yellow-800">Resignation Submitted</p>
            <p className="text-xs text-yellow-600">
              Last working day: {new Date(myResignation.lastWorkingDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · Status: {myResignation.status}
            </p>
          </div>
        </div>
      )}

      {/* Submit form */}
      {showForm && currentEmployeeId && (
        <div className="bg-white rounded-xl border border-red-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-1">Resignation Notice</h3>
          <p className="text-xs text-slate-400 mb-4">This will be submitted to HR for processing.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resignation Date *</Label>
                <Input type="date" value={form.resignationDate} onChange={(e) => setForm((p) => ({ ...p, resignationDate: e.target.value }))} required className="border-slate-200" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last Working Date *</Label>
                <Input type="date" value={form.lastWorkingDate} onChange={(e) => setForm((p) => ({ ...p, lastWorkingDate: e.target.value }))} required className="border-slate-200" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reason</Label>
                <Input value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} placeholder="Reason for leaving (optional)" className="border-slate-200" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Additional Notes</Label>
                <Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Any additional notes..." className="border-slate-200" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="border-slate-200" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={loading} className="bg-red-600 hover:bg-red-700 text-white">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Resignation"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
        {["ALL","PENDING","APPROVED","COMPLETED","REJECTED"].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-all", filter === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
            {s}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <UserMinus className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No resignation records</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((r: any) => (
              <div key={r.id}>
                <div className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                      <UserMinus className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {r.employee.firstName} {r.employee.lastName}
                        <span className="text-xs text-slate-400 font-normal ml-1.5">({r.employee.employeeCode})</span>
                      </p>
                      <p className="text-xs text-slate-400">
                        {r.employee.position?.title ?? r.employee.department?.name} ·
                        Last day: {new Date(r.lastWorkingDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                      {r.reason && <p className="text-xs text-slate-400 mt-0.5 italic">"{r.reason}"</p>}
                      {r.exitInterviewDone && (
                        <span className="text-[10px] font-semibold bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full">
                          EXIT INTERVIEW DONE
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", STATUS_STYLES[r.status])}>{r.status}</span>
                    {isHR && r.status === "PENDING" && (
                      <div className="flex gap-1.5">
                        <Button size="sm" onClick={() => handleAction(r.id, "APPROVED")} disabled={loading} className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white px-2.5">
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleAction(r.id, "REJECTED")} disabled={loading} className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50 px-2.5">
                          Reject
                        </Button>
                      </div>
                    )}
                    {isHR && r.status === "APPROVED" && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <Switch checked={exitDone} onCheckedChange={setExitDone} />
                          <span className="text-xs text-slate-500">Exit done</span>
                        </div>
                        <Button size="sm" onClick={() => handleAction(r.id, "COMPLETED")} disabled={loading} className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white px-2.5">
                          Complete
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
