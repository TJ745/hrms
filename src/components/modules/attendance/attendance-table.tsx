"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getInitials, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@prisma/client";

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  PRESENT:  "bg-green-50 text-green-700 border-green-200",
  ABSENT:   "bg-red-50 text-red-700 border-red-200",
  LATE:     "bg-yellow-50 text-yellow-700 border-yellow-200",
  HALF_DAY: "bg-orange-50 text-orange-700 border-orange-200",
  ON_LEAVE: "bg-blue-50 text-blue-700 border-blue-200",
  HOLIDAY:  "bg-purple-50 text-purple-700 border-purple-200",
  WEEKEND:  "bg-slate-50 text-slate-500 border-slate-200",
};

type Record = {
  id:        string;
  date:      Date;
  checkIn:   Date | null;
  checkOut:  Date | null;
  status:    AttendanceStatus;
  workHours: any;
  overtime:  any;
  isManual:  boolean;
  employee: {
    id:           string;
    firstName:    string;
    lastName:     string;
    avatar:       string | null;
    employeeCode: string;
    department:   { name: string } | null;
  };
};

type Props = {
  records:        Record[];
  total:          number;
  page:           number;
  totalPages:     number;
  month:          number;
  year:           number;
  orgSlug:        string;
  isHR:           boolean;
  organizationId: string;
};

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export function AttendanceTable({ records, total, page, totalPages, month, year, orgSlug, isHR }: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const sp       = useSearchParams();
  const [, startTransition] = useTransition();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    params.set(key, value);
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function setPage(p: number) {
    const params = new URLSearchParams(sp.toString());
    params.set("page", String(p));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      {/* Header + month picker */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 border-slate-200"
            onClick={() => {
              const d = new Date(year, month - 2);
              updateParam("month", String(d.getMonth() + 1));
              updateParam("year",  String(d.getFullYear()));
            }}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <span className="text-sm font-semibold text-slate-800 min-w-[130px] text-center">
            {MONTHS[month - 1]} {year}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 border-slate-200"
            onClick={() => {
              const d = new Date(year, month);
              updateParam("month", String(d.getMonth() + 1));
              updateParam("year",  String(d.getFullYear()));
            }}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
        <p className="text-xs text-slate-400">{total} records</p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
              {isHR && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</th>}
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Clock In</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Clock Out</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Hours</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Overtime</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {records.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-slate-400 text-sm">
                  No attendance records for this period
                </td>
              </tr>
            ) : (
              records.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 text-slate-700 text-sm">
                    {formatDate(rec.date)}
                    {rec.isManual && (
                      <span className="ml-1.5 text-[10px] text-slate-400 border border-slate-200 rounded px-1">Manual</span>
                    )}
                  </td>
                  {isHR && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={rec.employee.avatar ?? undefined} />
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                            {getInitials(`${rec.employee.firstName} ${rec.employee.lastName}`)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-slate-800 text-sm">{rec.employee.firstName} {rec.employee.lastName}</p>
                          <p className="text-xs text-slate-400">{rec.employee.employeeCode}</p>
                        </div>
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-3 text-slate-600 tabular-nums">
                    {rec.checkIn
                      ? new Date(rec.checkIn).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 tabular-nums">
                    {rec.checkOut
                      ? new Date(rec.checkOut).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 tabular-nums">
                    {rec.workHours ? `${Number(rec.workHours).toFixed(1)}h` : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 tabular-nums">
                    {Number(rec.overtime) > 0
                      ? <span className="text-purple-600 font-medium">+{Number(rec.overtime).toFixed(1)}h</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
                      STATUS_STYLES[rec.status]
                    )}>
                      {rec.status.charAt(0) + rec.status.slice(1).toLowerCase().replace("_", " ")}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Showing {((page - 1) * 30) + 1}–{Math.min(page * 30, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7 border-slate-200" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs text-slate-600 px-2">{page} / {totalPages}</span>
            <Button variant="outline" size="icon" className="h-7 w-7 border-slate-200" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
