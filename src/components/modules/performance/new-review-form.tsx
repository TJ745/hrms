"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPerformanceReview } from "@/actions/performance.actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft } from "lucide-react";

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  position: { title: string } | null;
  department: { name: string } | null;
};

type Props = {
  employees: Employee[];
  currentEmployeeId: string | null;
  organizationId: string;
  orgSlug: string;
};

const PERIODS = [
  "Q1 2025",
  "Q2 2025",
  "Q3 2025",
  "Q4 2025",
  "Q1 2026",
  "Q2 2026",
  "Q3 2026",
  "Q4 2026",
  "Annual 2024",
  "Annual 2025",
  "Annual 2026",
  "Mid-Year 2025",
  "Mid-Year 2026",
];

export function NewReviewForm({
  employees,
  currentEmployeeId,
  organizationId,
  orgSlug,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [reviewerId, setReviewerId] = useState(currentEmployeeId ?? "");
  const [period, setPeriod] = useState("");
  const [customPeriod, setCustomPeriod] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const finalPeriod = useCustom ? customPeriod.trim() : period;
    if (!employeeId) {
      setError("Please select an employee");
      return;
    }
    if (!reviewerId) {
      setError("Please select a reviewer");
      return;
    }
    if (!finalPeriod) {
      setError("Please select or enter a review period");
      return;
    }

    setLoading(true);
    const result = await createPerformanceReview({
      organizationId,
      employeeId,
      reviewerId,
      period: finalPeriod,
    });
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push(`/${orgSlug}/performance/${result.data.id}`);
  }

  const selected = employees.find((e) => e.id === employeeId);

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-slate-200 p-6 space-y-5"
    >
      {/* Employee */}
      <div className="space-y-1.5">
        <Label className="text-slate-700 text-sm font-medium">Employee *</Label>
        <Select
          value={employeeId || "NONE"}
          onValueChange={(v) => setEmployeeId(v === "NONE" ? "" : v)}
        >
          <SelectTrigger className="border-slate-200">
            <SelectValue placeholder="Select employee to review" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">Select employee</SelectItem>
            {employees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName}
                <span className="text-slate-400 ml-2 text-xs">
                  {emp.position?.title ??
                    emp.department?.name ??
                    emp.employeeCode}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected && (
          <p className="text-xs text-slate-400 mt-1">
            {selected.employeeCode}
            {selected.position && ` · ${selected.position.title}`}
            {selected.department && ` · ${selected.department.name}`}
          </p>
        )}
      </div>

      {/* Reviewer */}
      <div className="space-y-1.5">
        <Label className="text-slate-700 text-sm font-medium">Reviewer *</Label>
        <Select
          value={reviewerId || "NONE"}
          onValueChange={(v) => setReviewerId(v === "NONE" ? "" : v)}
        >
          <SelectTrigger className="border-slate-200">
            <SelectValue placeholder="Select reviewer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">Select reviewer</SelectItem>
            <SelectItem value="TJ">TJ</SelectItem>
            {employees
              .filter((e) => e.id !== employeeId)
              .map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                  <span className="text-slate-400 ml-2 text-xs">
                    {emp.position?.title ??
                      emp.department?.name ??
                      emp.employeeCode}
                  </span>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Period */}
      <div className="space-y-1.5">
        <Label className="text-slate-700 text-sm font-medium">
          Review Period *
        </Label>
        {!useCustom ? (
          <div className="flex gap-2">
            <Select
              value={period || "NONE"}
              onValueChange={(v) => setPeriod(v === "NONE" ? "" : v)}
            >
              <SelectTrigger className="border-slate-200 flex-1">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Select period</SelectItem>
                {PERIODS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              className="border-slate-200 text-slate-500 text-sm shrink-0"
              onClick={() => setUseCustom(true)}
            >
              Custom
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              value={customPeriod}
              onChange={(e) => setCustomPeriod(e.target.value)}
              placeholder="e.g. H1 2025, Annual 2025..."
              className="border-slate-200 flex-1"
            />
            <Button
              type="button"
              variant="outline"
              className="border-slate-200 text-slate-500 text-sm shrink-0"
              onClick={() => setUseCustom(false)}
            >
              Preset
            </Button>
          </div>
        )}
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
            "Start Review"
          )}
        </Button>
      </div>
    </form>
  );
}
