"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generatePayroll } from "@/actions/payroll.actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft, Zap } from "lucide-react";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 1, currentYear, currentYear + 1];

type Props = {
  organizationId: string;
  branches: { id: string; name: string }[];
  orgSlug: string;
  userRole: string;
  userBranchId: string | null;
};

export function ProcessPayrollForm({
  organizationId,
  branches,
  orgSlug,
  userRole,
  userBranchId,
}: Props) {
  const router = useRouter();
  const now = new Date();

  const [form, setForm] = useState({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    branchId: userRole === "HR_MANAGER" ? (userBranchId ?? "") : "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await generatePayroll({
      organizationId,
      branchId: form.branchId || undefined,
      month: form.month,
      year: form.year,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    router.push(`/${orgSlug}/payroll/run/${result.data.payroll.id}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-slate-200 p-6 space-y-5"
    >
      {/* Month */}
      <div className="space-y-1.5">
        <Label className="text-slate-700 text-sm font-medium">
          Payroll Month *
        </Label>
        <Select
          value={String(form.month)}
          onValueChange={(v) => setForm((p) => ({ ...p, month: parseInt(v) }))}
        >
          <SelectTrigger className="h-10 border-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => (
              <SelectItem key={m.value} value={String(m.value)}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Year */}
      <div className="space-y-1.5">
        <Label className="text-slate-700 text-sm font-medium">Year *</Label>
        <Select
          value={String(form.year)}
          onValueChange={(v) => setForm((p) => ({ ...p, year: parseInt(v) }))}
        >
          <SelectTrigger className="h-10 border-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Branch */}
      {userRole !== "HR_MANAGER" && (
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-sm font-medium">Branch</Label>
          <Select
            value={form.branchId || "ALL"}
            onValueChange={(v) =>
              setForm((p) => ({ ...p, branchId: v === "ALL" ? "" : v }))
            }
          >
            <SelectTrigger className="h-10 border-slate-200">
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-400">
            Leave blank to process all branches at once
          </p>
        </div>
      )}

      {/* Info box */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700 space-y-1">
        <p className="font-medium">What will be calculated:</p>
        <p className="text-xs text-blue-600">
          ✓ Basic salary based on attendance (days present / working days)
        </p>
        <p className="text-xs text-blue-600">✓ Overtime pay at 1.5× rate</p>
        <p className="text-xs text-blue-600">
          ✓ All active allowances and deductions
        </p>
        <p className="text-xs text-blue-600">
          ✓ Active loan installment deductions
        </p>
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
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Zap className="w-4 h-4 mr-1.5" /> Generate Payroll
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
