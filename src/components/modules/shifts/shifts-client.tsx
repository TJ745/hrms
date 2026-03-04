"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createWorkSchedule, createShift, assignEmployeeShift, deleteEmployeeShift } from "@/actions/features.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Clock, Calendar, ChevronLeft, ChevronRight, X, Loader2, Users, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NUMS  = [1, 2, 3, 4, 5, 6, 0]; // Mon=1...Sun=0

type Shift        = { id: string; name: string; startTime: string; endTime: string; isNight: boolean };
type Schedule     = { id: string; name: string; workDays: number[]; startTime: string; endTime: string; breakDuration: number; isDefault: boolean; shifts: Shift[]; _count: { employees: number } };
type RosterEntry  = { id: string; employeeId: string; shiftId: string; date: string; shift: { id: string; name: string; startTime: string; endTime: string; isNight: boolean; workSchedule: { name: string } }; employee: { id: string; firstName: string; lastName: string; avatar: string | null; employeeCode: string; department: { name: string } | null } };
type Employee     = { id: string; firstName: string; lastName: string; employeeCode: string; avatar: string | null; department: { name: string } | null };

type Props = {
  schedules: Schedule[]; roster: RosterEntry[]; employees: Employee[];
  weekStart: string; organizationId: string; orgSlug: string;
};

export function ShiftsClient({ schedules, roster, employees, weekStart: initialWeekStart, organizationId }: Props) {
  const router = useRouter();
  const [tab,         setTab]         = useState<"roster" | "schedules">("roster");
  const [weekStart,   setWeekStart]   = useState(initialWeekStart);
  const [loading,     setLoading]     = useState(false);
  const [showSchedForm, setShowSchedForm] = useState(false);
  const [showShiftForm, setShowShiftForm] = useState<string | null>(null); // scheduleId
  const [assignModal,   setAssignModal]   = useState<{ employeeId: string; date: string } | null>(null);

  const [schedForm, setSchedForm] = useState({ name: "", workDays: [1,2,3,4,5] as number[], startTime: "09:00", endTime: "18:00", breakDuration: "60", isDefault: false });
  const [shiftForm, setShiftForm] = useState({ name: "", startTime: "", endTime: "", isNight: false });
  const [assignShiftId, setAssignShiftId] = useState("");

  // Build week days array
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + "T12:00:00");
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  // Build roster lookup: employeeId → date → entry
  const rosterMap: Record<string, Record<string, RosterEntry>> = {};
  roster.forEach(r => {
    if (!rosterMap[r.employeeId]) rosterMap[r.employeeId] = {};
    rosterMap[r.employeeId][r.date] = r;
  });

  // All shifts across schedules
  const allShifts = schedules.flatMap(s => s.shifts.map(sh => ({ ...sh, scheduleName: s.name })));

  function prevWeek() {
    const d = new Date(weekStart + "T12:00:00");
    d.setDate(d.getDate() - 7);
    setWeekStart(d.toISOString().split("T")[0]);
    router.push(`?week=${d.toISOString().split("T")[0]}`);
  }
  function nextWeek() {
    const d = new Date(weekStart + "T12:00:00");
    d.setDate(d.getDate() + 7);
    setWeekStart(d.toISOString().split("T")[0]);
    router.push(`?week=${d.toISOString().split("T")[0]}`);
  }

  async function handleCreateSchedule(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    await createWorkSchedule({ organizationId, name: schedForm.name, workDays: schedForm.workDays, startTime: schedForm.startTime, endTime: schedForm.endTime, breakDuration: Number(schedForm.breakDuration), isDefault: schedForm.isDefault });
    setLoading(false); setShowSchedForm(false); router.refresh();
  }

  async function handleCreateShift(e: React.FormEvent) {
    e.preventDefault(); if (!showShiftForm) return; setLoading(true);
    await createShift({ workScheduleId: showShiftForm, name: shiftForm.name, startTime: shiftForm.startTime, endTime: shiftForm.endTime, isNight: shiftForm.isNight });
    setLoading(false); setShowShiftForm(null); setShiftForm({ name: "", startTime: "", endTime: "", isNight: false }); router.refresh();
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault(); if (!assignModal || !assignShiftId) return; setLoading(true);
    await assignEmployeeShift({ employeeId: assignModal.employeeId, shiftId: assignShiftId, date: assignModal.date });
    setLoading(false); setAssignModal(null); setAssignShiftId(""); router.refresh();
  }

  async function handleRemoveShift(entryId: string) {
    setLoading(true); await deleteEmployeeShift(entryId); setLoading(false); router.refresh();
  }

  const SHIFT_COLORS = ["bg-blue-100 text-blue-700", "bg-green-100 text-green-700", "bg-violet-100 text-violet-700", "bg-orange-100 text-orange-700", "bg-pink-100 text-pink-700"];
  const shiftColorMap: Record<string, string> = {};
  allShifts.forEach((s, i) => { shiftColorMap[s.id] = SHIFT_COLORS[i % SHIFT_COLORS.length]; });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Shift Scheduling</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage work schedules and assign shifts to employees</p>
        </div>
        {tab === "schedules" && (
          <Button onClick={() => setShowSchedForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white"><Plus className="w-4 h-4 mr-1.5" />New Schedule</Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
        {[{ key: "roster", label: "Weekly Roster", icon: Calendar }, { key: "schedules", label: `Schedules (${schedules.length})`, icon: Clock }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)} className={cn("flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all", tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* ── ROSTER TAB ── */}
      {tab === "roster" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={prevWeek} className="p-2 rounded-lg hover:bg-slate-100 border border-slate-200"><ChevronLeft className="w-4 h-4 text-slate-500" /></button>
            <span className="text-sm font-semibold text-slate-700">
              {new Date(weekDays[0] + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {new Date(weekDays[6] + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            <button onClick={nextWeek} className="p-2 rounded-lg hover:bg-slate-100 border border-slate-200"><ChevronRight className="w-4 h-4 text-slate-500" /></button>
            <button onClick={() => { const m = new Date(); m.setDate(m.getDate() - (m.getDay() === 0 ? 6 : m.getDay() - 1)); setWeekStart(m.toISOString().split("T")[0]); router.refresh(); }} className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg font-semibold hover:bg-blue-100">This Week</button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 w-40">Employee</th>
                  {weekDays.map((d, i) => {
                    const isToday = d === new Date().toISOString().split("T")[0];
                    return (
                      <th key={d} className={cn("px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide", isToday ? "text-blue-600" : "text-slate-400")}>
                        <div>{DAY_NAMES[i]}</div>
                        <div className={cn("text-sm font-bold mt-0.5", isToday ? "text-blue-600" : "text-slate-700")}>{new Date(d + "T12:00:00").getDate()}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.slice(0, 20).map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {emp.avatar ? <img src={emp.avatar} className="w-7 h-7 rounded-full object-cover shrink-0" alt="" /> : <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-[10px] font-bold text-slate-600">{emp.firstName[0]}{emp.lastName[0]}</div>}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{emp.firstName} {emp.lastName}</p>
                          <p className="text-[10px] text-slate-400 truncate">{emp.department?.name ?? "—"}</p>
                        </div>
                      </div>
                    </td>
                    {weekDays.map((date) => {
                      const entry = rosterMap[emp.id]?.[date];
                      return (
                        <td key={date} className="px-1 py-1.5 text-center">
                          {entry ? (
                            <div className={cn("group relative inline-flex flex-col items-center px-2 py-1 rounded-lg text-[9px] font-semibold leading-tight cursor-pointer", shiftColorMap[entry.shiftId] ?? "bg-slate-100 text-slate-600")}
                              onClick={() => handleRemoveShift(entry.id)}>
                              <span className="flex items-center gap-0.5">{entry.shift.isNight ? <Moon className="w-2.5 h-2.5" /> : <Sun className="w-2.5 h-2.5" />}{entry.shift.name}</span>
                              <span className="opacity-70">{entry.shift.startTime}–{entry.shift.endTime}</span>
                              <span className="absolute inset-0 bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center"><X className="w-3 h-3 text-red-500" /></span>
                            </div>
                          ) : (
                            allShifts.length > 0 && (
                              <button onClick={() => { setAssignModal({ employeeId: emp.id, date }); setAssignShiftId(allShifts[0].id); }}
                                className="w-full h-8 rounded-lg border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors flex items-center justify-center">
                                <Plus className="w-3 h-3 text-slate-300 hover:text-blue-400" />
                              </button>
                            )
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {employees.length === 0 && <div className="py-12 text-center"><Users className="w-10 h-10 text-slate-200 mx-auto mb-3" /><p className="text-slate-400 text-sm">No active employees</p></div>}
          </div>
          <p className="text-xs text-slate-400">Click an assigned shift to remove it. Click + to assign a shift.</p>
        </div>
      )}

      {/* ── SCHEDULES TAB ── */}
      {tab === "schedules" && (
        <div className="space-y-4">
          {showSchedForm && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-4">New Work Schedule</h3>
              <form onSubmit={handleCreateSchedule} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name *</Label>
                    <Input value={schedForm.name} onChange={e => setSchedForm(p => ({ ...p, name: e.target.value }))} required className="border-slate-200" placeholder="e.g. Standard Office" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Break (minutes)</Label>
                    <Input type="number" value={schedForm.breakDuration} onChange={e => setSchedForm(p => ({ ...p, breakDuration: e.target.value }))} className="border-slate-200" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Start Time</Label>
                    <Input type="time" value={schedForm.startTime} onChange={e => setSchedForm(p => ({ ...p, startTime: e.target.value }))} className="border-slate-200" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">End Time</Label>
                    <Input type="time" value={schedForm.endTime} onChange={e => setSchedForm(p => ({ ...p, endTime: e.target.value }))} className="border-slate-200" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block mb-2">Work Days</Label>
                  <div className="flex gap-2">
                    {DAY_NAMES.map((name, i) => {
                      const num = DAY_NUMS[i];
                      const on  = schedForm.workDays.includes(num);
                      return (
                        <button key={name} type="button" onClick={() => setSchedForm(p => ({ ...p, workDays: on ? p.workDays.filter(d => d !== num) : [...p.workDays, num] }))}
                          className={cn("w-9 h-9 rounded-lg text-xs font-semibold transition-all", on ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}>
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="default" checked={schedForm.isDefault} onChange={e => setSchedForm(p => ({ ...p, isDefault: e.target.checked }))} className="rounded" />
                  <label htmlFor="default" className="text-sm font-medium text-slate-700">Set as default schedule</label>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="border-slate-200" onClick={() => setShowSchedForm(false)}>Cancel</Button>
                  <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Schedule"}</Button>
                </div>
              </form>
            </div>
          )}

          {schedules.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 py-16 text-center"><Clock className="w-10 h-10 text-slate-200 mx-auto mb-3" /><p className="text-slate-400 text-sm">No schedules yet</p></div>
          ) : (
            <div className="space-y-4">
              {schedules.map((s) => (
                <div key={s.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center"><Clock className="w-4 h-4 text-blue-500" /></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-800">{s.name}</p>
                          {s.isDefault && <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">DEFAULT</span>}
                        </div>
                        <p className="text-xs text-slate-400">{s.startTime} – {s.endTime} · {s.breakDuration}min break · {s._count.employees} employees</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {DAY_NAMES.map((name, i) => {
                          const on = s.workDays.includes(DAY_NUMS[i]);
                          return <span key={name} className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", on ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400")}>{name}</span>;
                        })}
                      </div>
                      <Button onClick={() => { setShowShiftForm(s.id); setShiftForm({ name: "", startTime: s.startTime, endTime: s.endTime, isNight: false }); }} variant="outline" className="border-slate-200 h-8 text-xs"><Plus className="w-3 h-3 mr-1" />Add Shift</Button>
                    </div>
                  </div>

                  {showShiftForm === s.id && (
                    <div className="px-5 py-4 bg-blue-50/30 border-b border-slate-100">
                      <form onSubmit={handleCreateShift} className="flex items-end gap-3 flex-wrap">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-slate-500">Shift Name *</Label>
                          <Input value={shiftForm.name} onChange={e => setShiftForm(p => ({ ...p, name: e.target.value }))} required className="border-slate-200 h-9 w-32" placeholder="e.g. Morning" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-slate-500">Start</Label>
                          <Input type="time" value={shiftForm.startTime} onChange={e => setShiftForm(p => ({ ...p, startTime: e.target.value }))} required className="border-slate-200 h-9" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-slate-500">End</Label>
                          <Input type="time" value={shiftForm.endTime} onChange={e => setShiftForm(p => ({ ...p, endTime: e.target.value }))} required className="border-slate-200 h-9" />
                        </div>
                        <div className="flex items-center gap-1.5 pb-0.5">
                          <input type="checkbox" id={`night-${s.id}`} checked={shiftForm.isNight} onChange={e => setShiftForm(p => ({ ...p, isNight: e.target.checked }))} className="rounded" />
                          <label htmlFor={`night-${s.id}`} className="text-xs text-slate-600">Night shift</label>
                        </div>
                        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white h-9 text-xs">{loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add"}</Button>
                        <button type="button" onClick={() => setShowShiftForm(null)} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-400" /></button>
                      </form>
                    </div>
                  )}

                  {s.shifts.length === 0 ? (
                    <div className="px-5 py-4 text-xs text-slate-400">No shifts defined yet. Add a shift above.</div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {s.shifts.map(sh => (
                        <div key={sh.id} className="flex items-center gap-3 px-5 py-3">
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", sh.isNight ? "bg-slate-800" : "bg-amber-50")}>
                            {sh.isNight ? <Moon className="w-3.5 h-3.5 text-slate-300" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{sh.name}</p>
                            <p className="text-xs text-slate-400">{sh.startTime} – {sh.endTime}{sh.isNight ? " (night)" : ""}</p>
                          </div>
                          <span className={cn("ml-auto text-[10px] font-bold px-2 py-1 rounded-full", shiftColorMap[sh.id] ?? "bg-slate-100 text-slate-500")}>
                            {sh.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Assign shift modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAssignModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="font-bold text-slate-900 mb-1">Assign Shift</h2>
            <p className="text-xs text-slate-400 mb-4">
              {new Date(assignModal.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <form onSubmit={handleAssign} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Shift *</Label>
                <Select value={assignShiftId} onValueChange={setAssignShiftId}>
                  <SelectTrigger className="border-slate-200"><SelectValue placeholder="Select shift" /></SelectTrigger>
                  <SelectContent>
                    {schedules.flatMap(s => s.shifts.map(sh => (
                      <SelectItem key={sh.id} value={sh.id}>{sh.name} ({sh.startTime}–{sh.endTime}) · {s.name}</SelectItem>
                    )))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1 border-slate-200" onClick={() => setAssignModal(null)}>Cancel</Button>
                <Button type="submit" disabled={loading || !assignShiftId} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Assign"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
