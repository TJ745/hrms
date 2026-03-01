"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createHoliday, deleteHoliday, updateHoliday } from "@/actions/hr-operations.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, CalendarDays, Trash2, Globe, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

type Holiday = {
  id: string;
  name: string;
  date: string;
  isRecurring: boolean;
  branchId: string | null;
  branch: { name: string } | null;
};

type Props = {
  holidays: Holiday[];
  branches: { id: string; name: string }[];
  isHR: boolean;
  organizationId: string;
  orgSlug: string;
};

export function HolidaysClient({ holidays, branches, isHR, organizationId, orgSlug }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    date: "",
    branchId: "all",
    isRecurring: false,
  });

  const filtered = selectedMonth !== null
    ? holidays.filter((h) => new Date(h.date).getMonth() === selectedMonth)
    : holidays;

  // Group by month for display
  const grouped = filtered.reduce((acc, h) => {
    const month = new Date(h.date).getMonth();
    if (!acc[month]) acc[month] = [];
    acc[month].push(h);
    return acc;
  }, {} as Record<number, Holiday[]>);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await createHoliday({
      organizationId,
      branchId: form.branchId !== "all" ? form.branchId : undefined,
      name: form.name,
      date: form.date,
      isRecurring: form.isRecurring,
    });
    setLoading(false);
    setShowForm(false);
    setForm({ name: "", date: "", branchId: "all", isRecurring: false });
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this holiday?")) return;
    setLoading(true);
    await deleteHoliday(id);
    setLoading(false);
    router.refresh();
  }

  const upcomingCount = holidays.filter((h) => new Date(h.date) >= new Date()).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Holidays</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {upcomingCount} upcoming holiday{upcomingCount !== 1 ? "s" : ""} this year
          </p>
        </div>
        {isHR && (
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Holiday
          </Button>
        )}
      </div>

      {/* Add form */}
      {showForm && isHR && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">New Holiday</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Name *
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                  placeholder="Christmas Day"
                  className="border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Date *
                </Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                  required
                  className="border-slate-200"
                />
              </div>
              {branches.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Scope
                  </Label>
                  <Select
                    value={form.branchId}
                    onValueChange={(v) => setForm((p) => ({ ...p, branchId: v }))}
                  >
                    <SelectTrigger className="border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.isRecurring}
                onCheckedChange={(v) => setForm((p) => ({ ...p, isRecurring: v }))}
              />
              <Label className="text-sm text-slate-700">Recurring every year</Label>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-slate-200"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Holiday"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Month filter */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setSelectedMonth(null)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
            selectedMonth === null
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          )}
        >
          All
        </button>
        {MONTHS.map((m, i) => (
          <button
            key={m}
            onClick={() => setSelectedMonth(selectedMonth === i ? null : i)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              selectedMonth === i
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            )}
          >
            {m.slice(0, 3)}
          </button>
        ))}
      </div>

      {/* Holiday list grouped by month */}
      {Object.keys(grouped).length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <CalendarDays className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No holidays found</p>
          {isHR && (
            <p className="text-slate-300 text-xs mt-1">
              Click "Add Holiday" to add your first holiday
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([month, monthHolidays]) => (
              <div key={month} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-700">
                    {MONTHS[Number(month)]}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({monthHolidays.length} holiday{monthHolidays.length !== 1 ? "s" : ""})
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {monthHolidays.map((h) => {
                    const date = new Date(h.date);
                    const isPast = date < new Date();
                    return (
                      <div
                        key={h.id}
                        className={cn(
                          "flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors",
                          isPast && "opacity-60"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 text-center shrink-0">
                            <p className="text-xs font-semibold text-slate-400 uppercase">
                              {date.toLocaleDateString("en-US", { month: "short" })}
                            </p>
                            <p className="text-xl font-bold text-slate-800 leading-tight">
                              {date.getDate()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{h.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-slate-400">
                                {date.toLocaleDateString("en-US", { weekday: "long" })}
                              </span>
                              {h.isRecurring && (
                                <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">
                                  RECURRING
                                </span>
                              )}
                              {h.branch ? (
                                <span className="flex items-center gap-1 text-[10px] font-semibold bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full">
                                  <Building2 className="w-2.5 h-2.5" />
                                  {h.branch.name}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                                  <Globe className="w-2.5 h-2.5" />
                                  All Branches
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {isHR && (
                          <button
                            onClick={() => handleDelete(h.id)}
                            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
