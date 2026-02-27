"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestLeave } from "@/actions/leave.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowLeft } from "lucide-react";

type Balance = {
  id:         string;
  allocated:  any;
  used:       any;
  pending:    any;
  carried:    any;
  leaveType:  { name: string; color: string | null };
  leaveTypeId: string;
};

type Props = {
  employeeId: string;
  balances:   Balance[];
  orgSlug:    string;
};

export function NewLeaveRequestForm({ employeeId, balances, orgSlug }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [form, setForm] = useState({
    leaveTypeId:   "",
    startDate:     "",
    endDate:       "",
    reason:        "",
    isHalfDay:     false,
    halfDayPeriod: "MORNING",
  });

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Calculate working days between dates
  const workingDays = (() => {
    if (!form.startDate || !form.endDate) return 0;
    if (form.isHalfDay) return 0.5;
    const start   = new Date(form.startDate);
    const end     = new Date(form.endDate);
    if (end < start) return 0;
    let days      = 0;
    const current = new Date(start);
    while (current <= end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) days++;
      current.setDate(current.getDate() + 1);
    }
    return days;
  })();

  // Selected balance
  const selectedBalance = balances.find((b) => b.leaveTypeId === form.leaveTypeId);
  const available = selectedBalance
    ? Number(selectedBalance.allocated) + Number(selectedBalance.carried) - Number(selectedBalance.used) - Number(selectedBalance.pending)
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await requestLeave({
      employeeId:    employeeId,
      leaveTypeId:   form.leaveTypeId,
      startDate:     form.startDate,
      endDate:       form.isHalfDay ? form.startDate : form.endDate,
      reason:        form.reason    || undefined,
      isHalfDay:     form.isHalfDay,
      halfDayPeriod: form.isHalfDay ? form.halfDayPeriod : undefined,
    });

    setLoading(false);
    if (!result.success) { setError(result.error); return; }
    router.push(`/${orgSlug}/leave/requests`);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
      {/* Leave type */}
      <div className="space-y-1.5">
        <Label className="text-slate-700 text-sm font-medium">Leave Type *</Label>
        <Select value={form.leaveTypeId} onValueChange={(v) => set("leaveTypeId", v)}>
          <SelectTrigger className="h-10 border-slate-200">
            <SelectValue placeholder="Select leave type" />
          </SelectTrigger>
          <SelectContent>
            {balances.map((b) => {
              const avail = Number(b.allocated) + Number(b.carried) - Number(b.used) - Number(b.pending);
              return (
                <SelectItem key={b.leaveTypeId} value={b.leaveTypeId} disabled={avail <= 0}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: b.leaveType.color ?? "#94a3b8" }} />
                    {b.leaveType.name}
                    <span className="text-slate-400 text-xs">({avail} days left)</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Half day toggle */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="halfDay"
          checked={form.isHalfDay}
          onCheckedChange={(v) => set("isHalfDay", !!v)}
        />
        <Label htmlFor="halfDay" className="text-slate-700 text-sm cursor-pointer">Half day</Label>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-sm font-medium">
            {form.isHalfDay ? "Date *" : "Start Date *"}
          </Label>
          <Input
            type="date"
            value={form.startDate}
            onChange={(e) => set("startDate", e.target.value)}
            required
            min={new Date().toISOString().split("T")[0]}
            className="h-10 border-slate-200"
          />
        </div>
        {!form.isHalfDay && (
          <div className="space-y-1.5">
            <Label className="text-slate-700 text-sm font-medium">End Date *</Label>
            <Input
              type="date"
              value={form.endDate}
              onChange={(e) => set("endDate", e.target.value)}
              required
              min={form.startDate || new Date().toISOString().split("T")[0]}
              className="h-10 border-slate-200"
            />
          </div>
        )}
        {form.isHalfDay && (
          <div className="space-y-1.5">
            <Label className="text-slate-700 text-sm font-medium">Period</Label>
            <Select value={form.halfDayPeriod} onValueChange={(v) => set("halfDayPeriod", v)}>
              <SelectTrigger className="h-10 border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MORNING">Morning</SelectItem>
                <SelectItem value="AFTERNOON">Afternoon</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Duration summary */}
      {workingDays > 0 && (
        <div className={`rounded-lg px-4 py-3 text-sm flex items-center justify-between
          ${available !== null && workingDays > available
            ? "bg-red-50 border border-red-200 text-red-700"
            : "bg-blue-50 border border-blue-200 text-blue-700"}`}>
          <span>Duration: <strong>{workingDays} working day{workingDays !== 1 ? "s" : ""}</strong></span>
          {available !== null && (
            <span>{available} day{available !== 1 ? "s" : ""} available</span>
          )}
        </div>
      )}

      {/* Reason */}
      <div className="space-y-1.5">
        <Label className="text-slate-700 text-sm font-medium">Reason</Label>
        <Textarea
          value={form.reason}
          onChange={(e) => set("reason", e.target.value)}
          placeholder="Optional reason for your leave request..."
          rows={3}
          className="border-slate-200 resize-none"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          className="border-slate-200"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
        </Button>
        <Button
          type="submit"
          disabled={loading || !form.leaveTypeId || !form.startDate || (!form.isHalfDay && !form.endDate)}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Leave Request"}
        </Button>
      </div>
    </form>
  );
}
