"use client";

import Link from "next/link";
import {
  Clock, CheckCircle, Calendar, DollarSign, Target,
  Megaphone, ChevronRight, Star, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const GOAL_STATUS_STYLES: Record<string, string> = {
  NOT_STARTED: "bg-slate-100 text-slate-500",
  IN_PROGRESS: "bg-blue-100 text-blue-600",
  COMPLETED:   "bg-green-100 text-green-600",
  CANCELLED:   "bg-red-100 text-red-500",
};

type Props = {
  stats:    any;
  employee: any;
  orgSlug:  string;
  userName: string;
};

export function EmployeeDashboard({ stats, employee, orgSlug, userName }: Props) {
  const today    = new Date();
  const greeting = today.getHours() < 12 ? "Good morning" : today.getHours() < 17 ? "Good afternoon" : "Good evening";

  const isCheckedIn  = !!stats.todayAttendance?.checkIn;
  const isCheckedOut = !!stats.todayAttendance?.checkOut;
  const presentDays  = stats.attendanceSummary["PRESENT"] ?? 0;
  const lateDays     = stats.attendanceSummary["LATE"]    ?? 0;
  const absentDays   = stats.attendanceSummary["ABSENT"]  ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">{greeting}, {userName.split(" ")[0]} 👋</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {employee.position?.title && `${employee.position.title} · `}
          {employee.department?.name && `${employee.department.name} · `}
          {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Today status + quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's attendance */}
        <div className={cn(
          "rounded-xl border p-5",
          isCheckedIn && !isCheckedOut ? "bg-green-50 border-green-200" :
          isCheckedOut                 ? "bg-slate-50 border-slate-200" :
          "bg-orange-50 border-orange-200"
        )}>
          <div className="flex items-center gap-2 mb-2">
            <Clock className={cn("w-4 h-4", isCheckedIn ? "text-green-600" : "text-orange-500")} />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Today</span>
          </div>
          {stats.todayAttendance ? (
            <div>
              <p className={cn("text-sm font-semibold", isCheckedIn ? "text-green-700" : "text-orange-600")}>
                {isCheckedOut ? "Checked Out" : isCheckedIn ? "Checked In" : "Not Checked In"}
              </p>
              {stats.todayAttendance.checkIn && (
                <p className="text-xs text-slate-400 mt-0.5">
                  In: {new Date(stats.todayAttendance.checkIn).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  {stats.todayAttendance.checkOut && ` · Out: ${new Date(stats.todayAttendance.checkOut).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`}
                </p>
              )}
              {stats.todayAttendance.workHours && (
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  {Number(stats.todayAttendance.workHours).toFixed(1)}h worked
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-orange-600">Not Checked In</p>
              <Link href={`/${orgSlug}/attendance`}>
                <Button size="sm" className="mt-2 h-7 text-xs bg-orange-500 hover:bg-orange-600 text-white">
                  Clock In
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* This month attendance */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">This Month</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-slate-600"><CheckCircle className="w-3.5 h-3.5 text-green-500" /> Present</span>
              <span className="font-semibold text-slate-800 tabular-nums">{presentDays}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-slate-600"><Clock className="w-3.5 h-3.5 text-yellow-500" /> Late</span>
              <span className="font-semibold text-slate-800 tabular-nums">{lateDays}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-slate-600"><AlertCircle className="w-3.5 h-3.5 text-red-400" /> Absent</span>
              <span className="font-semibold text-slate-800 tabular-nums">{absentDays}</span>
            </div>
          </div>
        </div>

        {/* Leave balance summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Leave Balance</p>
            <Link href={`/${orgSlug}/leave`} className="text-[10px] text-blue-500 font-medium">View all</Link>
          </div>
          {stats.leaveBalances.length === 0 ? (
            <p className="text-slate-300 text-xs">No balances assigned</p>
          ) : (
            <div className="space-y-1.5">
              {stats.leaveBalances.slice(0, 3).map((lb: any) => {
                const remaining = Number(lb.allocated) + Number(lb.carried) - Number(lb.used) - Number(lb.pending);
                return (
                  <div key={lb.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 truncate pr-2">{lb.leaveType.name}</span>
                    <span className="font-semibold text-slate-800 tabular-nums shrink-0">{remaining} left</span>
                  </div>
                );
              })}
            </div>
          )}
          {stats.pendingLeaveRequests > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-100">
              <p className="text-xs text-yellow-600 font-medium">{stats.pendingLeaveRequests} pending request{stats.pendingLeaveRequests !== 1 ? "s" : ""}</p>
            </div>
          )}
        </div>

        {/* Pending reviews / goals */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Performance</p>
          <div className="space-y-2">
            {stats.pendingReviews > 0 && (
              <Link href={`/${orgSlug}/performance`}>
                <div className="flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 rounded-lg p-2 hover:bg-yellow-100 transition-colors">
                  <Star className="w-3.5 h-3.5 shrink-0" />
                  <span>{stats.pendingReviews} review{stats.pendingReviews !== 1 ? "s" : ""} in progress</span>
                </div>
              </Link>
            )}
            <Link href={`/${orgSlug}/performance`}>
              <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 rounded-lg p-2 hover:bg-blue-100 transition-colors">
                <Target className="w-3.5 h-3.5 shrink-0" />
                <span>{stats.openGoals.length} active goal{stats.openGoals.length !== 1 ? "s" : ""}</span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Upcoming leave */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" /> Upcoming Leave
            </h3>
            <Link href={`/${orgSlug}/leave`}>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-500 hover:text-blue-600 px-2">
                Request leave
              </Button>
            </Link>
          </div>
          {stats.upcomingLeave.length === 0 ? (
            <p className="text-slate-300 text-sm text-center py-6">No upcoming leave</p>
          ) : (
            <div className="space-y-3">
              {stats.upcomingLeave.map((lr: any) => (
                <div key={lr.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: lr.leaveType.color ? `${lr.leaveType.color}20` : "#f0fdf4", color: lr.leaveType.color ?? "#16a34a" }}>
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{lr.leaveType.name}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(lr.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {lr.startDate !== lr.endDate && ` – ${new Date(lr.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                      {" · "}{Number(lr.totalDays)} day{Number(lr.totalDays) !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Goals */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-slate-400" /> My Goals
            </h3>
            <Link href={`/${orgSlug}/performance`} className="text-xs text-blue-500 hover:text-blue-600 font-medium">View all</Link>
          </div>
          {stats.openGoals.length === 0 ? (
            <p className="text-slate-300 text-sm text-center py-6">No active goals</p>
          ) : (
            <div className="space-y-3">
              {stats.openGoals.map((goal: any) => (
                <div key={goal.id}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-slate-800 truncate pr-2">{goal.title}</p>
                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0", GOAL_STATUS_STYLES[goal.status])}>
                      {goal.progress}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-400 rounded-full transition-all"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                  {goal.dueDate && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      Due {new Date(goal.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent payslips + announcements */}
        <div className="space-y-4">
          {/* Recent payslips */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-slate-400" /> Payslips
              </h3>
              <Link href={`/${orgSlug}/payroll/payslips`} className="text-xs text-blue-500 hover:text-blue-600 font-medium">View all</Link>
            </div>
            {stats.recentPayslips.length === 0 ? (
              <p className="text-slate-300 text-xs text-center py-3">No payslips yet</p>
            ) : (
              <div className="space-y-2">
                {stats.recentPayslips.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{MONTHS[item.payroll.month - 1]} {item.payroll.year}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800">
                        {Number(item.netSalary).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {item.currency}
                      </span>
                      <PayrollStatusDot status={item.payroll.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Announcements */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-slate-400" /> Announcements
              </h3>
              <Link href={`/${orgSlug}/announcements`} className="text-xs text-blue-500 hover:text-blue-600 font-medium">View all</Link>
            </div>
            {stats.recentAnnouncements.length === 0 ? (
              <p className="text-slate-300 text-xs text-center py-3">No announcements</p>
            ) : (
              <div className="space-y-2">
                {stats.recentAnnouncements.map((ann: any) => (
                  <div key={ann.id} className="flex items-start gap-2">
                    {ann.isPinned && <span className="text-[10px] text-blue-500 font-bold shrink-0 mt-0.5">PIN</span>}
                    <p className="text-xs text-slate-700 leading-relaxed line-clamp-2">{ann.title}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PayrollStatusDot({ status }: { status: string }) {
  const color = status === "PAID" ? "bg-green-400" : status === "PROCESSING" ? "bg-blue-400" : "bg-slate-300";
  return <div className={cn("w-2 h-2 rounded-full shrink-0", color)} title={status} />;
}
