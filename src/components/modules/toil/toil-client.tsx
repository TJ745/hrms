"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upsertTOILBalance } from "@/actions/features.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Clock, AlertTriangle, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Balance  = { id: string; employeeId: string; hoursEarned: number; hoursUsed: number; expiresAt: string | null; employee: { id: string; firstName: string; lastName: string; avatar: string | null; employeeCode: string; department: { name: string } | null } };
type Employee = { id: string; firstName: string; lastName: string; employeeCode: string; avatar: string | null; department: { name: string } | null };
type MyBalance = { hoursEarned: number; hoursUsed: number; expiresAt: string | null } | null;

type Props = { isHR: boolean; balances: Balance[]; employees: Employee[]; myBalance: MyBalance; orgSlug: string };

export function TOILClient({ isHR, balances, employees, myBalance }: Props) {
  const router = useRouter();
  const [loading,   setLoading]   = useState(false);
  const [showForm,  setShowForm]  = useState(false);
  const [formType,  setFormType]  = useState<"earn" | "use">("earn");
  const [form, setForm] = useState({ employeeId: "", hours: "", expiresAt: "", notes: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    await upsertTOILBalance({
      employeeId: form.employeeId,
      ...(formType === "earn" ? { hoursEarned: Number(form.hours) } : { hoursUsed: Number(form.hours) }),
      expiresAt:  form.expiresAt || undefined,
    });
    setLoading(false); setShowForm(false); setForm({ employeeId: "", hours: "", expiresAt: "", notes: "" }); router.refresh();
  }

  // ── EMPLOYEE VIEW ─────────────────────────────────────────────
  if (!isHR) {
    const balance  = myBalance ?? { hoursEarned: 0, hoursUsed: 0, expiresAt: null };
    const remaining = balance.hoursEarned - balance.hoursUsed;
    const usedPct   = balance.hoursEarned > 0 ? Math.min(100, Math.round((balance.hoursUsed / balance.hoursEarned) * 100)) : 0;
    const isExpired = balance.expiresAt && new Date(balance.expiresAt) < new Date();
    const isExpiringSoon = balance.expiresAt && !isExpired && new Date(balance.expiresAt) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    return (
      <div className="space-y-5 max-w-lg">
        <div>
          <h1 className="text-xl font-bold text-slate-900">TOIL Balance</h1>
          <p className="text-sm text-slate-500 mt-0.5">Time Off in Lieu — hours earned for overtime worked</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          {/* Balance circle */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                <circle cx="50" cy="50" r="40" fill="none" stroke={remaining <= 0 ? "#ef4444" : isExpiringSoon ? "#f97316" : "#3b82f6"} strokeWidth="10"
                  strokeDasharray={`${usedPct * 2.51} 251`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className={cn("text-2xl font-bold", remaining < 0 ? "text-red-500" : "text-slate-900")}>{remaining.toFixed(1)}</p>
                <p className="text-xs text-slate-400">hrs left</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="text-center p-3 bg-green-50 rounded-xl">
              <TrendingUp className="w-4 h-4 text-green-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-slate-900">{balance.hoursEarned.toFixed(1)}</p>
              <p className="text-xs text-slate-500">Hours Earned</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-xl">
              <TrendingDown className="w-4 h-4 text-blue-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-slate-900">{balance.hoursUsed.toFixed(1)}</p>
              <p className="text-xs text-slate-500">Hours Used</p>
            </div>
          </div>

          {balance.expiresAt && (
            <div className={cn("flex items-center gap-2 p-3 rounded-xl", isExpired ? "bg-red-50" : isExpiringSoon ? "bg-orange-50" : "bg-slate-50")}>
              <AlertTriangle className={cn("w-4 h-4 shrink-0", isExpired ? "text-red-500" : isExpiringSoon ? "text-orange-500" : "text-slate-400")} />
              <p className={cn("text-xs font-medium", isExpired ? "text-red-600" : isExpiringSoon ? "text-orange-600" : "text-slate-500")}>
                {isExpired ? "Balance expired on " : "Balance expires on "}
                {new Date(balance.expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
          )}

          {!myBalance && <p className="text-xs text-slate-400 text-center mt-2">No TOIL balance recorded yet. Contact HR if you have overtime hours.</p>}
        </div>
      </div>
    );
  }

  // ── HR VIEW ────────────────────────────────────────────────────
  const employeesWithoutBalance = employees.filter(e => !balances.find(b => b.employeeId === e.id));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">TOIL Balances</h1>
          <p className="text-sm text-slate-500 mt-0.5">Time Off in Lieu — manage earned and used TOIL hours</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setFormType("use"); setShowForm(true); }} variant="outline" className="border-slate-200 text-blue-600"><TrendingDown className="w-4 h-4 mr-1.5" />Record Usage</Button>
          <Button onClick={() => { setFormType("earn"); setShowForm(true); }} className="bg-green-600 hover:bg-green-700 text-white"><Plus className="w-4 h-4 mr-1.5" />Add Earned Hours</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Employees with TOIL", value: balances.length, color: "bg-blue-50 text-blue-600", icon: Clock },
          { label: "Total Hours Earned",  value: `${balances.reduce((a, b) => a + b.hoursEarned, 0).toFixed(1)}h`, color: "bg-green-50 text-green-600", icon: TrendingUp },
          { label: "Total Hours Remaining", value: `${balances.reduce((a, b) => a + (b.hoursEarned - b.hoursUsed), 0).toFixed(1)}h`, color: "bg-violet-50 text-violet-600", icon: Clock },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", s.color)}><s.icon className="w-5 h-5" /></div>
            <div><p className="text-2xl font-bold text-slate-900">{s.value}</p><p className="text-xs text-slate-500">{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">{formType === "earn" ? "Add Earned TOIL Hours" : "Record TOIL Usage"}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Employee *</Label>
                <Select value={form.employeeId} onValueChange={v => setForm(p => ({ ...p, employeeId: v }))}>
                  <SelectTrigger className="border-slate-200"><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hours *</Label>
                <Input type="number" step="0.5" min="0.5" value={form.hours} onChange={e => setForm(p => ({ ...p, hours: e.target.value }))} required className="border-slate-200" placeholder="e.g. 4" />
              </div>
            </div>
            {formType === "earn" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expiry Date (optional)</Label>
                <Input type="date" value={form.expiresAt} onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))} className="border-slate-200" />
              </div>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="border-slate-200" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={loading} className={cn("text-white", formType === "earn" ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700")}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : formType === "earn" ? "Add Earned Hours" : "Record Usage"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Balances list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {balances.length === 0 ? (
          <div className="py-16 text-center"><Clock className="w-10 h-10 text-slate-200 mx-auto mb-3" /><p className="text-slate-400 text-sm">No TOIL balances recorded yet</p></div>
        ) : (
          <>
            <div className="grid grid-cols-5 px-5 py-2.5 bg-slate-50 border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <span className="col-span-2">Employee</span><span>Earned</span><span>Used</span><span>Remaining</span>
            </div>
            <div className="divide-y divide-slate-100">
              {balances.map((b) => {
                const remaining      = b.hoursEarned - b.hoursUsed;
                const usedPct        = b.hoursEarned > 0 ? Math.min(100, Math.round((b.hoursUsed / b.hoursEarned) * 100)) : 0;
                const isExpired      = b.expiresAt && new Date(b.expiresAt) < new Date();
                const isExpiringSoon = b.expiresAt && !isExpired && new Date(b.expiresAt) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                return (
                  <div key={b.id} className="grid grid-cols-5 px-5 py-4 items-center hover:bg-slate-50 transition-colors">
                    <div className="col-span-2 flex items-center gap-2.5">
                      {b.employee.avatar ? <img src={b.employee.avatar} className="w-8 h-8 rounded-full object-cover shrink-0" alt="" /> : <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 shrink-0">{b.employee.firstName[0]}{b.employee.lastName[0]}</div>}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{b.employee.firstName} {b.employee.lastName}</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs text-slate-400">{b.employee.department?.name ?? "—"}</p>
                          {isExpired && <span className="text-[9px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">EXPIRED</span>}
                          {isExpiringSoon && <span className="text-[9px] font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">EXPIRING SOON</span>}
                        </div>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-green-600">{b.hoursEarned.toFixed(1)}h</span>
                    <span className="text-sm font-semibold text-slate-500">{b.hoursUsed.toFixed(1)}h</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm font-bold", remaining < 0 ? "text-red-500" : remaining === 0 ? "text-slate-400" : "text-blue-600")}>{remaining.toFixed(1)}h</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                        <div className={cn("h-1.5 rounded-full transition-all", usedPct >= 100 ? "bg-red-500" : usedPct >= 75 ? "bg-orange-400" : "bg-blue-500")} style={{ width: `${usedPct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {employeesWithoutBalance.length > 0 && (
        <p className="text-xs text-slate-400">{employeesWithoutBalance.length} employee{employeesWithoutBalance.length !== 1 ? "s" : ""} have no TOIL balance yet.</p>
      )}
    </div>
  );
}
