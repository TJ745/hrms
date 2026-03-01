"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS    = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS  = ["January","February","March","April","May","June","July","August","September","October","November","December"];

type LeaveRequest = {
  id:        string;
  startDate: string;
  endDate:   string;
  status:    string;
  employee:  { firstName: string; lastName: string; avatar: string | null };
  leaveType: { name: string; color: string | null };
};

type Holiday = {
  id:   string;
  name: string;
  date: string;
};

type Props = {
  leaveRequests: LeaveRequest[];
  holidays:      Holiday[];
  isHR:          boolean;
  orgSlug:       string;
};

function isoDate(d: Date) {
  return d.toISOString().split("T")[0];
}

function datesBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start);
  const fin = new Date(end);
  while (cur <= fin) {
    dates.push(isoDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export function LeaveCalendarClient({ leaveRequests, holidays, isHR, orgSlug }: Props) {
  const today   = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  // Build calendar grid
  const firstDay   = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  // Build lookup: date string → { leaves, holiday }
  const leaveMap: Record<string, LeaveRequest[]> = {};
  leaveRequests.forEach((lr) => {
    datesBetween(
      lr.startDate.split("T")[0],
      lr.endDate.split("T")[0]
    ).forEach((d) => {
      if (!leaveMap[d]) leaveMap[d] = [];
      leaveMap[d].push(lr);
    });
  });

  const holidayMap: Record<string, Holiday> = {};
  holidays.forEach((h) => {
    holidayMap[h.date.split("T")[0]] = h;
  });

  // Selected day events
  const selectedLeaves   = selectedDay ? (leaveMap[selectedDay]   ?? []) : [];
  const selectedHoliday  = selectedDay ? (holidayMap[selectedDay] ?? null) : null;

  // Legend: unique leave types
  const leaveTypes = [...new Map(leaveRequests.map((lr) => [lr.leaveType.name, lr.leaveType])).values()];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Leave Calendar</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isHR ? "Team leave overview and public holidays" : "Your leave schedule and public holidays"}
          </p>
        </div>
        {/* Month navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <span className="text-sm font-semibold text-slate-800 w-36 text-center">
            {MONTHS[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
          <button
            onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}
            className="ml-2 px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-slate-100">
            {DAYS.map((d) => (
              <div key={d} className="py-2.5 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Cells */}
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="h-20 border-b border-r border-slate-50" />;
              }

              const dateStr    = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayLeaves  = leaveMap[dateStr]  ?? [];
              const dayHoliday = holidayMap[dateStr] ?? null;
              const isToday    = dateStr === isoDate(today);
              const isSelected = dateStr === selectedDay;
              const isWeekend  = (idx % 7 === 0) || (idx % 7 === 6);

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                  className={cn(
                    "h-20 border-b border-r border-slate-50 p-1.5 cursor-pointer transition-colors flex flex-col",
                    isSelected  ? "bg-blue-50 border-blue-200"  : "hover:bg-slate-50",
                    isWeekend   ? "bg-slate-50/50" : "",
                    dayHoliday  ? "bg-orange-50/40" : "",
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full",
                      isToday
                        ? "bg-blue-600 text-white"
                        : isWeekend ? "text-slate-400" : "text-slate-700"
                    )}>
                      {day}
                    </span>
                    {dayHoliday && (
                      <span className="text-[8px] font-semibold bg-orange-100 text-orange-600 px-1 py-0.5 rounded truncate max-w-[60px]">
                        {dayHoliday.name}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    {dayLeaves.slice(0, 2).map((lr) => (
                      <div
                        key={lr.id}
                        className="text-[9px] font-semibold px-1 py-0.5 rounded truncate"
                        style={{
                          backgroundColor: lr.leaveType.color ? `${lr.leaveType.color}22` : "#3b82f622",
                          color:           lr.leaveType.color ?? "#3b82f6",
                        }}
                      >
                        {isHR ? `${lr.employee.firstName} ${lr.employee.lastName[0]}.` : lr.leaveType.name}
                      </div>
                    ))}
                    {dayLeaves.length > 2 && (
                      <span className="text-[9px] text-slate-400 px-1">+{dayLeaves.length - 2} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar panel */}
        <div className="space-y-4">
          {/* Selected day detail */}
          {selectedDay ? (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">
                {new Date(selectedDay + "T12:00:00").toLocaleDateString("en-US", {
                  weekday: "long", month: "long", day: "numeric",
                })}
              </h3>

              {selectedHoliday && (
                <div className="flex items-center gap-2 p-2.5 bg-orange-50 rounded-lg mb-2">
                  <CalendarDays className="w-4 h-4 text-orange-500 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-orange-700">{selectedHoliday.name}</p>
                    <p className="text-[10px] text-orange-500">Public Holiday</p>
                  </div>
                </div>
              )}

              {selectedLeaves.length === 0 && !selectedHoliday && (
                <p className="text-xs text-slate-400 text-center py-4">No leave on this day</p>
              )}

              <div className="space-y-2">
                {selectedLeaves.map((lr) => (
                  <div key={lr.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50">
                    {lr.employee.avatar ? (
                      <img src={lr.employee.avatar} className="w-7 h-7 rounded-full object-cover shrink-0" alt="" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-[10px] font-bold text-blue-600">
                        {lr.employee.firstName[0]}{lr.employee.lastName[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {lr.employee.firstName} {lr.employee.lastName}
                      </p>
                      <p className="text-[10px] text-slate-400">{lr.leaveType.name}</p>
                    </div>
                    <span className={cn(
                      "text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0",
                      lr.status === "APPROVED" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    )}>
                      {lr.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-400 text-center py-4">Click a day to see details</p>
            </div>
          )}

          {/* Month summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
              {MONTHS[month]} Summary
            </h3>
            {(() => {
              const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
              const monthLeaves = leaveRequests.filter(
                (lr) => lr.startDate.startsWith(monthPrefix) || lr.endDate.startsWith(monthPrefix)
              );
              const monthHolidays = holidays.filter((h) => h.date.startsWith(monthPrefix));

              if (monthLeaves.length === 0 && monthHolidays.length === 0) {
                return <p className="text-xs text-slate-400 text-center py-2">No events this month</p>;
              }

              return (
                <div className="space-y-2">
                  {monthHolidays.map((h) => (
                    <div key={h.id} className="flex items-center justify-between text-xs">
                      <span className="text-orange-600 font-medium truncate">{h.name}</span>
                      <span className="text-slate-400 shrink-0 ml-2">
                        {new Date(h.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  ))}
                  {monthLeaves.slice(0, 8).map((lr) => (
                    <div key={lr.id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium truncate">
                        {isHR ? `${lr.employee.firstName} ${lr.employee.lastName}` : lr.leaveType.name}
                      </span>
                      <span className="text-slate-400 shrink-0 ml-2">
                        {new Date(lr.startDate + (lr.startDate.includes("T") ? "" : "T12:00:00")).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  ))}
                  {monthLeaves.length > 8 && (
                    <p className="text-xs text-slate-400">+{monthLeaves.length - 8} more</p>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Legend */}
          {leaveTypes.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Legend</h3>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-orange-200 shrink-0" />
                  <span className="text-xs text-slate-600">Public Holiday</span>
                </div>
                {leaveTypes.map((lt) => (
                  <div key={lt.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm shrink-0"
                      style={{ backgroundColor: lt.color ?? "#3b82f6" }}
                    />
                    <span className="text-xs text-slate-600">{lt.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
