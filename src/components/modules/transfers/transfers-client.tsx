"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTransfer, approveTransfer } from "@/actions/hr-operations.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, ArrowRightLeft, CheckCircle, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  PENDING:   "bg-yellow-100 text-yellow-700",
  APPROVED:  "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  REJECTED:  "bg-red-100 text-red-600",
};

type Props = {
  transfers:   any[];
  employees:   any[];
  branches:    { id: string; name: string }[];
  departments: { id: string; name: string; branchId: string | null }[];
  positions:   { id: string; title: string }[];
  isHR:        boolean;
  organizationId: string;
  orgSlug:     string;
};

export function TransfersClient({ transfers, employees, branches, departments, positions, isHR, organizationId, orgSlug }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [filter,   setFilter]   = useState("ALL");
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [form, setForm] = useState({
    employeeId: "", toBranchId: "", toDepartmentId: "",
    toPositionId: "", effectiveDate: "", reason: "",
  });

  const filtered = filter === "ALL" ? transfers : transfers.filter((t: any) => t.status === filter);

  function handleEmployeeSelect(empId: string) {
    const emp = employees.find((e: any) => e.id === empId);
    setSelectedEmployee(emp ?? null);
    setForm((p) => ({ ...p, employeeId: empId }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEmployee) return;
    setLoading(true);
    await createTransfer({
      employeeId:       form.employeeId,
      organizationId,
      fromBranchId:     selectedEmployee.branchId,
      toBranchId:       form.toBranchId,
      fromDepartmentId: selectedEmployee.departmentId ?? undefined,
      toDepartmentId:   form.toDepartmentId || undefined,
      fromPositionId:   selectedEmployee.positionId ?? undefined,
      toPositionId:     form.toPositionId || undefined,
      effectiveDate:    form.effectiveDate,
      reason:           form.reason || undefined,
    });
    setLoading(false);
    setShowForm(false);
    setForm({ employeeId: "", toBranchId: "", toDepartmentId: "", toPositionId: "", effectiveDate: "", reason: "" });
    setSelectedEmployee(null);
    router.refresh();
  }

  async function handleAction(transferId: string, status: string) {
    setLoading(true);
    await approveTransfer({ transferId, status: status as any, organizationId });
    setLoading(false);
    router.refresh();
  }

  const toBranchDepts = form.toBranchId
    ? departments.filter((d) => d.branchId === form.toBranchId || d.branchId === null)
    : departments;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Employee Transfers</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage inter-branch and department transfers</p>
        </div>
        {isHR && (
          <Button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-1.5" /> New Transfer
          </Button>
        )}
      </div>

      {/* Form */}
      {showForm && isHR && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Create Transfer Request</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Employee *</Label>
                <Select value={form.employeeId} onValueChange={handleEmployeeSelect}>
                  <SelectTrigger className="border-slate-200"><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeCode})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {selectedEmployee && (
                <div className="col-span-2 p-3 bg-slate-50 rounded-lg text-xs text-slate-500">
                  Current: Branch #{selectedEmployee.branchId?.slice(-6)} · Dept #{selectedEmployee.departmentId?.slice(-6) ?? "None"} · Position #{selectedEmployee.positionId?.slice(-6) ?? "None"}
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">To Branch *</Label>
                <Select value={form.toBranchId} onValueChange={(v) => setForm((p) => ({ ...p, toBranchId: v }))}>
                  <SelectTrigger className="border-slate-200"><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">To Department</Label>
                <Select value={form.toDepartmentId} onValueChange={(v) => setForm((p) => ({ ...p, toDepartmentId: v }))}>
                  <SelectTrigger className="border-slate-200"><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Same / No change</SelectItem>
                    {toBranchDepts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">To Position</Label>
                <Select value={form.toPositionId} onValueChange={(v) => setForm((p) => ({ ...p, toPositionId: v }))}>
                  <SelectTrigger className="border-slate-200"><SelectValue placeholder="Select position" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Same / No change</SelectItem>
                    {positions.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Effective Date *</Label>
                <Input type="date" value={form.effectiveDate} onChange={(e) => setForm((p) => ({ ...p, effectiveDate: e.target.value }))} required className="border-slate-200" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reason</Label>
                <Input value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} placeholder="Reason for transfer..." className="border-slate-200" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="border-slate-200" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={loading || !form.employeeId || !form.toBranchId} className="bg-blue-600 hover:bg-blue-700 text-white">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Transfer"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
        {["ALL", "PENDING", "APPROVED", "COMPLETED", "REJECTED"].map((s) => (
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
            <ArrowRightLeft className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No transfers found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <ArrowRightLeft className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {t.employee.firstName} {t.employee.lastName}
                      <span className="text-slate-400 text-xs font-normal ml-1.5">({t.employee.employeeCode})</span>
                    </p>
                    <p className="text-xs text-slate-400">
                      {t.fromBranch?.name ?? "?"} → Branch #{t.toBranchId?.slice(-6)} ·
                      Effective {new Date(t.effectiveDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    {t.reason && <p className="text-xs text-slate-400 mt-0.5 italic">{t.reason}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", STATUS_STYLES[t.status] ?? "bg-slate-100 text-slate-500")}>{t.status}</span>
                  {isHR && t.status === "PENDING" && (
                    <div className="flex gap-1.5">
                      <Button size="sm" onClick={() => handleAction(t.id, "APPROVED")} disabled={loading} className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white px-2.5">
                        Approve
                      </Button>
                      <Button size="sm" onClick={() => handleAction(t.id, "COMPLETED")} disabled={loading} className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white px-2.5">
                        Complete
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleAction(t.id, "REJECTED")} disabled={loading} className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50 px-2.5">
                        Reject
                      </Button>
                    </div>
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
