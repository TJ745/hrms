"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createContract, updateContractStatus, deleteContract } from "@/actions/contract.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, FileText, AlertTriangle, Trash2, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const CONTRACT_TYPES = ["PERMANENT","FIXED_TERM","PROBATION","RENEWAL"];
const STATUS_STYLES: Record<string, string> = {
  ACTIVE:      "bg-green-100 text-green-700",
  EXPIRED:     "bg-red-100 text-red-600",
  TERMINATED:  "bg-slate-100 text-slate-500",
};

function daysUntil(date: Date | null) {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

type Props = {
  contracts:         any[];
  stats:             any;
  employees:         any[];
  isHR:              boolean;
  currentEmployeeId: string | null;
  organizationId:    string;
  orgSlug:           string;
};

export function ContractsClient({ contracts, stats, employees, isHR, currentEmployeeId, organizationId, orgSlug }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [filter,   setFilter]   = useState("ALL");
  const [form, setForm] = useState({
    employeeId: "", type: "PERMANENT", startDate: "", endDate: "",
    autoRenew: false, reminderDays: "30", notes: "",
  });

  const filtered = filter === "ALL" ? contracts : contracts.filter((c: any) => c.status === filter);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await createContract({
      employeeId:    form.employeeId || currentEmployeeId!,
      organizationId,
      type:          form.type as any,
      startDate:     form.startDate,
      endDate:       form.endDate || undefined,
      autoRenew:     form.autoRenew,
      reminderDays:  parseInt(form.reminderDays),
      notes:         form.notes || undefined,
    });
    setLoading(false);
    setShowForm(false);
    router.refresh();
  }

  async function handleDelete(contractId: string) {
    if (!confirm("Delete this contract?")) return;
    setLoading(true);
    await deleteContract(contractId, organizationId);
    setLoading(false);
    router.refresh();
  }

  async function handleStatusChange(contractId: string, status: string) {
    setLoading(true);
    await updateContractStatus({ contractId, status: status as any, organizationId });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Contracts</h1>
          <p className="text-sm text-slate-500 mt-0.5">{isHR ? "Manage employee contracts and renewals" : "Your employment contracts"}</p>
        </div>
        {isHR && (
          <Button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-1.5" /> New Contract
          </Button>
        )}
      </div>

      {/* Stats */}
      {isHR && stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Active",   value: stats.active,   color: "text-green-600",  bg: "bg-green-50" },
            { label: "Expiring (30d)", value: stats.expiring, color: "text-orange-600", bg: "bg-orange-50" },
            { label: "Expired",  value: stats.expired,  color: "text-red-600",    bg: "bg-red-50" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", s.bg)}>
                <FileText className={cn("w-5 h-5", s.color)} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className={cn("text-2xl font-bold tabular-nums", s.color)}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Contract Form */}
      {showForm && isHR && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">New Contract</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Employee *</Label>
                <Select value={form.employeeId} onValueChange={v => setForm(p => ({...p, employeeId: v}))}>
                  <SelectTrigger className="border-slate-200"><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeCode})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Contract Type *</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({...p, type: v}))}>
                  <SelectTrigger className="border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>{CONTRACT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace("_"," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Start Date *</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm(p => ({...p, startDate: e.target.value}))} required className="border-slate-200" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wide">End Date</Label>
                <Input type="date" value={form.endDate} onChange={e => setForm(p => ({...p, endDate: e.target.value}))} className="border-slate-200" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Reminder Days</Label>
                <Input type="number" min="1" value={form.reminderDays} onChange={e => setForm(p => ({...p, reminderDays: e.target.value}))} className="border-slate-200" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Notes</Label>
                <Input value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} className="border-slate-200" placeholder="Optional notes..." />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.autoRenew} onCheckedChange={v => setForm(p => ({...p, autoRenew: v}))} />
              <Label className="text-sm text-slate-700">Auto-renew on expiry</Label>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="border-slate-200" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Contract"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
        {["ALL","ACTIVE","EXPIRED","TERMINATED"].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-all", filter === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
            {s}
          </button>
        ))}
      </div>

      {/* Contracts list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No contracts found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((contract: any) => {
              const days = daysUntil(contract.endDate);
              const isExpiringSoon = days !== null && days <= 30 && days >= 0 && contract.status === "ACTIVE";
              return (
                <div key={contract.id} className={cn("flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors", isExpiringSoon && "bg-orange-50/30")}>
                  <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", isExpiringSoon ? "bg-orange-100" : "bg-blue-50")}>
                      {isExpiringSoon ? <AlertTriangle className="w-5 h-5 text-orange-500" /> : <FileText className="w-5 h-5 text-blue-500" />}
                    </div>
                    <div>
                      {isHR && <p className="text-sm font-semibold text-slate-800">{contract.employee.firstName} {contract.employee.lastName} <span className="text-slate-400 text-xs font-normal">({contract.employee.employeeCode})</span></p>}
                      <p className={cn("text-sm font-medium text-slate-700", !isHR && "font-semibold")}>{contract.type.replace("_"," ")} Contract</p>
                      <p className="text-xs text-slate-400">
                        {new Date(contract.startDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
                        {contract.endDate && ` → ${new Date(contract.endDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`}
                        {isExpiringSoon && <span className="ml-2 text-orange-600 font-semibold">Expires in {days}d</span>}
                        {contract.autoRenew && <span className="ml-2 text-blue-500 text-[10px] font-semibold">AUTO-RENEW</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", STATUS_STYLES[contract.status])}>{contract.status}</span>
                    {isHR && (
                      <>
                        {contract.status === "ACTIVE" && (
                          <Button size="sm" variant="outline" onClick={() => handleStatusChange(contract.id, "TERMINATED")} disabled={loading} className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50 px-2.5">
                            Terminate
                          </Button>
                        )}
                        <button onClick={() => handleDelete(contract.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
