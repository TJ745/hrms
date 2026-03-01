"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createExpenseClaim, updateExpenseStatus } from "@/actions/expense.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, DollarSign, CheckCircle, XCircle, Clock, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = ["TRAVEL","MEALS","ACCOMMODATION","EQUIPMENT","TRAINING","MEDICAL","OTHER"];
const STATUS_STYLES: Record<string, string> = {
  PENDING:  "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-blue-100 text-blue-700",
  REJECTED: "bg-red-100 text-red-600",
  PAID:     "bg-green-100 text-green-700",
};

type Props = {
  claims:            any[];
  summary:           any;
  isHR:              boolean;
  currentEmployeeId: string | null;
  organizationId:    string;
  orgSlug:           string;
};

export function ExpensesClient({ claims, summary, isHR, currentEmployeeId, organizationId, orgSlug }: Props) {
  const router = useRouter();
  const [showForm, setShowForm]   = useState(false);
  const [loading,  setLoading]    = useState(false);
  const [filter,   setFilter]     = useState<string>("ALL");
  const [form, setForm] = useState({
    title: "", amount: "", currency: "USD", category: "OTHER",
    expenseDate: new Date().toISOString().split("T")[0], description: "",
  });

  const filtered = filter === "ALL" ? claims : claims.filter(c => c.status === filter);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentEmployeeId) return;
    setLoading(true);
    await createExpenseClaim({
      employeeId:  currentEmployeeId,
      title:       form.title,
      amount:      parseFloat(form.amount),
      currency:    form.currency,
      category:    form.category as any,
      expenseDate: form.expenseDate,
      description: form.description,
    });
    setLoading(false);
    setShowForm(false);
    setForm({ title: "", amount: "", currency: "USD", category: "OTHER", expenseDate: new Date().toISOString().split("T")[0], description: "" });
    router.refresh();
  }

  async function handleStatusChange(claimId: string, status: string) {
    setLoading(true);
    await updateExpenseStatus({ claimId, status: status as any, organizationId });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Expense Claims</h1>
          <p className="text-sm text-slate-500 mt-0.5">{isHR ? "Review and manage expense claims" : "Submit and track your expenses"}</p>
        </div>
        {currentEmployeeId && (
          <Button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-1.5" /> New Claim
          </Button>
        )}
      </div>

      {/* Summary (HR only) */}
      {isHR && summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Pending",  value: summary.pending,              icon: Clock,        color: "text-yellow-600", bg: "bg-yellow-50" },
            { label: "Approved", value: summary.approved,             icon: CheckCircle,  color: "text-blue-600",   bg: "bg-blue-50" },
            { label: "Paid",     value: summary.paid,                 icon: CreditCard,   color: "text-green-600",  bg: "bg-green-50" },
            { label: "Total Approved", value: `${Number(summary.totalApprovedAmount).toLocaleString()}`, icon: DollarSign, color: "text-slate-700", bg: "bg-slate-50" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", s.bg)}>
                <s.icon className={cn("w-5 h-5", s.color)} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className={cn("text-2xl font-bold tabular-nums", s.color)}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Claim Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Submit Expense Claim</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Title *</Label>
                <Input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} required className="border-slate-200" placeholder="Business travel to NY" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Category *</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({...p, category: v}))}>
                  <SelectTrigger className="border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Amount *</Label>
                <Input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))} required className="border-slate-200" placeholder="250.00" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Currency</Label>
                <Select value={form.currency} onValueChange={v => setForm(p => ({...p, currency: v}))}>
                  <SelectTrigger className="border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>{["USD","EUR","GBP","PKR","AED","SAR","INR"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Expense Date *</Label>
                <Input type="date" value={form.expenseDate} onChange={e => setForm(p => ({...p, expenseDate: e.target.value}))} required className="border-slate-200" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Description</Label>
                <Input value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} className="border-slate-200" placeholder="Additional details..." />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="border-slate-200" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Claim"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
        {["ALL","PENDING","APPROVED","PAID","REJECTED"].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-all", filter === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Claims list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <DollarSign className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No expense claims found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((claim: any) => (
              <div key={claim.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <DollarSign className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{claim.title}</p>
                    <p className="text-xs text-slate-400">
                      {isHR && `${claim.employee.firstName} ${claim.employee.lastName} · `}
                      {claim.category} · {new Date(claim.expenseDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    {claim.description && <p className="text-xs text-slate-400 mt-0.5">{claim.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-base font-bold text-slate-800">{Number(claim.amount).toLocaleString()} {claim.currency}</p>
                  <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", STATUS_STYLES[claim.status])}>{claim.status}</span>
                  {isHR && claim.status === "PENDING" && (
                    <div className="flex gap-1.5">
                      <Button size="sm" onClick={() => handleStatusChange(claim.id, "APPROVED")} disabled={loading} className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white px-2.5">
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(claim.id, "REJECTED")} disabled={loading} className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50 px-2.5">
                        Reject
                      </Button>
                    </div>
                  )}
                  {isHR && claim.status === "APPROVED" && (
                    <Button size="sm" onClick={() => handleStatusChange(claim.id, "PAID")} disabled={loading} className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white px-2.5">
                      Mark Paid
                    </Button>
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
