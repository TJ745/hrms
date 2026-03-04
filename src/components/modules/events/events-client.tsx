"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCompanyEvent, updateCompanyEvent, deleteCompanyEvent } from "@/actions/features.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CalendarDays, MapPin, Users, Pencil, Trash2, X, Loader2, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const EVENT_TYPES = ["MEETING", "BIRTHDAY", "ANNIVERSARY", "EVENT", "TRAINING"];
const EVENT_COLORS: Record<string, string> = {
  MEETING:     "bg-blue-100 text-blue-700 border-blue-200",
  BIRTHDAY:    "bg-pink-100 text-pink-700 border-pink-200",
  ANNIVERSARY: "bg-purple-100 text-purple-700 border-purple-200",
  EVENT:       "bg-green-100 text-green-700 border-green-200",
  TRAINING:    "bg-orange-100 text-orange-700 border-orange-200",
};
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

type Event = {
  id: string; title: string; description: string | null; type: string;
  startDate: string; endDate: string; location: string | null;
  isAllDay: boolean; branchId: string | null; departmentId: string | null;
  branch: { name: string } | null; department: { name: string } | null;
};
type Props = {
  events: Event[]; branches: { id: string; name: string }[];
  departments: { id: string; name: string }[]; isHR: boolean;
  organizationId: string; orgSlug: string;
};

const emptyForm = { title: "", description: "", type: "EVENT", startDate: "", endDate: "", location: "", isAllDay: false, branchId: "", departmentId: "" };

export function EventsClient({ events, branches, departments, isHR, organizationId, orgSlug }: Props) {
  const router = useRouter();
  const today  = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [showForm,    setShowForm]    = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedDay,  setSelectedDay]  = useState<string | null>(null);
  const [deletingId,   setDeletingId]   = useState<string | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [form, setForm] = useState(emptyForm);

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  // Build event lookup per day
  const eventMap: Record<string, Event[]> = {};
  events.forEach((e) => {
    const start = new Date(e.startDate);
    const end   = new Date(e.endDate);
    const cur   = new Date(start);
    while (cur <= end) {
      if (cur.getFullYear() === year && cur.getMonth() === month) {
        const key = cur.getDate().toString();
        if (!eventMap[key]) eventMap[key] = [];
        eventMap[key].push(e);
      }
      cur.setDate(cur.getDate() + 1);
    }
  });

  const selectedEvents = selectedDay ? (eventMap[selectedDay] ?? []) : [];

  function openCreate() {
    setEditingEvent(null);
    const base = `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay ?? "01").padStart(2, "0")}`;
    setForm({ ...emptyForm, startDate: base + "T09:00", endDate: base + "T10:00" });
    setShowForm(true);
  }
  function openEdit(e: Event) {
    setEditingEvent(e);
    setForm({ title: e.title, description: e.description ?? "", type: e.type, startDate: e.startDate.slice(0, 16), endDate: e.endDate.slice(0, 16), location: e.location ?? "", isAllDay: e.isAllDay, branchId: e.branchId ?? "", departmentId: e.departmentId ?? "" });
    setShowForm(true);
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setLoading(true);
    if (editingEvent) {
      await updateCompanyEvent({ eventId: editingEvent.id, title: form.title, description: form.description || undefined, type: form.type, startDate: form.startDate, endDate: form.endDate, location: form.location || undefined, isAllDay: form.isAllDay });
    } else {
      await createCompanyEvent({ organizationId, title: form.title, description: form.description || undefined, type: form.type, startDate: form.startDate, endDate: form.endDate, location: form.location || undefined, isAllDay: form.isAllDay, branchId: form.branchId || undefined, departmentId: form.departmentId || undefined });
    }
    setLoading(false);
    setShowForm(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    setLoading(true);
    await deleteCompanyEvent(id);
    setLoading(false);
    setDeletingId(null);
    router.refresh();
  }

  const upcomingEvents = events.filter(e => new Date(e.startDate) >= today).slice(0, 5);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Company Events</h1>
          <p className="text-sm text-slate-500 mt-0.5">Meetings, holidays, birthdays and company-wide events</p>
        </div>
        {isHR && <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white"><Plus className="w-4 h-4 mr-1.5" />New Event</Button>}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {EVENT_TYPES.map((t) => (
          <span key={t} className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border", EVENT_COLORS[t])}>{t}</span>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronLeft className="w-4 h-4 text-slate-500" /></button>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-800">{MONTHS[month]} {year}</span>
              <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }} className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-lg font-semibold hover:bg-blue-100">Today</button>
            </div>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronRight className="w-4 h-4 text-slate-500" /></button>
          </div>

          <div className="grid grid-cols-7 border-b border-slate-100">
            {DAYS.map(d => <div key={d} className="py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">{d}</div>)}
          </div>

          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              if (!day) return <div key={`e-${idx}`} className="h-24 border-b border-r border-slate-50 bg-slate-50/30" />;
              const key      = day.toString();
              const dayEvts  = eventMap[key] ?? [];
              const dateStr  = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isToday  = dateStr === today.toISOString().split("T")[0];
              const isSel    = selectedDay === key;
              const isWeekend = idx % 7 === 0 || idx % 7 === 6;
              return (
                <div key={dateStr} onClick={() => setSelectedDay(isSel ? null : key)}
                  className={cn("h-24 border-b border-r border-slate-50 p-1.5 cursor-pointer transition-colors flex flex-col",
                    isSel ? "bg-blue-50" : "hover:bg-slate-50", isWeekend ? "bg-slate-50/40" : "")}>
                  <span className={cn("w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold mb-1 self-start",
                    isToday ? "bg-blue-600 text-white" : isWeekend ? "text-slate-400" : "text-slate-700")}>
                    {day}
                  </span>
                  <div className="space-y-0.5 overflow-hidden">
                    {dayEvts.slice(0, 2).map((e) => (
                      <div key={e.id} className={cn("text-[9px] font-semibold px-1 py-0.5 rounded truncate border", EVENT_COLORS[e.type] ?? "bg-slate-100 text-slate-600")}>
                        {e.title}
                      </div>
                    ))}
                    {dayEvts.length > 2 && <span className="text-[9px] text-slate-400 px-1">+{dayEvts.length - 2} more</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Selected day */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            {selectedDay ? (
              <>
                <h3 className="text-sm font-semibold text-slate-800 mb-3">
                  {new Date(`${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </h3>
                {selectedEvents.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">No events</p>
                ) : (
                  <div className="space-y-2">
                    {selectedEvents.map((e) => (
                      <div key={e.id} className={cn("p-3 rounded-xl border", EVENT_COLORS[e.type] ?? "bg-slate-50 border-slate-200")}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{e.title}</p>
                            {e.description && <p className="text-xs mt-0.5 opacity-70 truncate">{e.description}</p>}
                            <div className="flex flex-wrap gap-2 mt-1">
                              {!e.isAllDay && <span className="text-[10px] opacity-70">{new Date(e.startDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} – {new Date(e.endDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>}
                              {e.location && <span className="flex items-center gap-0.5 text-[10px] opacity-70"><MapPin className="w-2.5 h-2.5" />{e.location}</span>}
                            </div>
                          </div>
                          {isHR && (
                            <div className="flex gap-1 shrink-0">
                              <button onClick={() => openEdit(e)} className="p-1 rounded hover:bg-black/10"><Pencil className="w-3 h-3" /></button>
                              {deletingId === e.id ? (
                                <div className="flex gap-1">
                                  <button onClick={() => handleDelete(e.id)} disabled={loading} className="p-1 rounded hover:bg-black/10"><Check className="w-3 h-3" /></button>
                                  <button onClick={() => setDeletingId(null)} className="p-1 rounded hover:bg-black/10"><X className="w-3 h-3" /></button>
                                </div>
                              ) : (
                                <button onClick={() => setDeletingId(e.id)} className="p-1 rounded hover:bg-black/10"><Trash2 className="w-3 h-3" /></button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {isHR && (
                  <button onClick={openCreate} className="mt-3 w-full text-xs text-blue-600 hover:text-blue-700 font-semibold py-1.5 border border-dashed border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                    + Add event on this day
                  </button>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">Click a day to see events</p>
            )}
          </div>

          {/* Upcoming events */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Upcoming Events</h3>
            {upcomingEvents.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">No upcoming events</p>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((e) => (
                  <div key={e.id} className="flex items-center gap-3">
                    <div className={cn("w-2 h-8 rounded-full shrink-0", EVENT_COLORS[e.type]?.split(" ")[0] ?? "bg-slate-200")} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{e.title}</p>
                      <p className="text-[10px] text-slate-400">{new Date(e.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                    </div>
                    <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0", EVENT_COLORS[e.type] ?? "bg-slate-100 text-slate-500")}>{e.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">{editingEvent ? "Edit Event" : "New Event"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Title *</Label>
                <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required className="border-slate-200" placeholder="Event title" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Type</Label>
                  <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                    <SelectTrigger className="border-slate-200"><SelectValue /></SelectTrigger>
                    <SelectContent>{EVENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</Label>
                  <Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} className="border-slate-200" placeholder="Optional" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Start *</Label>
                  <Input type={form.isAllDay ? "date" : "datetime-local"} value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} required className="border-slate-200" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">End *</Label>
                  <Input type={form.isAllDay ? "date" : "datetime-local"} value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} required className="border-slate-200" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="allday" checked={form.isAllDay} onChange={e => setForm(p => ({ ...p, isAllDay: e.target.checked }))} className="rounded" />
                <label htmlFor="allday" className="text-xs text-slate-600 font-medium">All day event</label>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</Label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" placeholder="Optional description" />
              </div>
              {!editingEvent && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Branch</Label>
                    <Select value={form.branchId || "all"} onValueChange={v => setForm(p => ({ ...p, branchId: v === "all" ? "" : v }))}>
                      <SelectTrigger className="border-slate-200"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All branches</SelectItem>
                        {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Department</Label>
                    <Select value={form.departmentId || "all"} onValueChange={v => setForm(p => ({ ...p, departmentId: v === "all" ? "" : v }))}>
                      <SelectTrigger className="border-slate-200"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All departments</SelectItem>
                        {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1 border-slate-200" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : editingEvent ? "Save Changes" : "Create Event"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
