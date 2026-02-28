"use client";

import Link from "next/link";
import {
  Users, UserCheck, UserMinus, Clock, FileText, Briefcase,
  DollarSign, AlertTriangle, TrendingUp, Calendar, ChevronRight,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import type { SystemRole } from "@prisma/client";
const PIE_COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];

type Props = {
  stats:            any;
  orgSlug:          string;
  organizationName: string;
  userName:         string;
  userRole:         SystemRole;
};

function StatCard({
  label, value, sub, icon: Icon, color, href, alert,
}: {
  label:  string;
  value:  number | string;
  sub?:   string;
  icon:   React.ElementType;
  color:  string;
  href?:  string;
  alert?: boolean;
}) {
  const content = (
    <div className={cn(
      "bg-white rounded-xl border p-5 transition-all group",
      href ? "hover:shadow-md hover:border-blue-200 cursor-pointer" : "",
      alert && Number(value) > 0 ? "border-orange-200 bg-orange-50/30" : "border-slate-200"
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
          <p className={cn("text-3xl font-bold tabular-nums", color)}>{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", color.replace("text-", "bg-").replace("600", "100").replace("700", "100"))}>
          <Icon className={cn("w-5 h-5", color)} />
        </div>
      </div>
      {href && (
        <div className="flex items-center gap-1 mt-3 text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
          View details <ChevronRight className="w-3 h-3" />
        </div>
      )}
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export function HRDashboard({ stats, orgSlug, organizationName, userName, userRole }: Props) {
  const today = new Date();
  const greeting = today.getHours() < 12 ? "Good morning" : today.getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{greeting}, {userName.split(" ")[0]} 👋</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {organizationName} · {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/${orgSlug}/employees/new`}>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              + Add Employee
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Employees"   value={stats.totalEmployees}       icon={Users}         color="text-slate-700"  href={`/${orgSlug}/employees`} />
        <StatCard label="Present Today"     value={stats.presentToday}         icon={UserCheck}     color="text-green-600"  href={`/${orgSlug}/attendance`} />
        <StatCard label="On Leave Today"    value={stats.onLeaveToday}         icon={UserMinus}     color="text-yellow-600" />
        <StatCard label="Absent Today"      value={stats.absentToday < 0 ? 0 : stats.absentToday} icon={Clock} color="text-red-500" />
      </div>

      {/* Secondary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending Leave"     value={stats.pendingLeaveRequests} icon={FileText}      color="text-blue-600"   href={`/${orgSlug}/leave`}   alert />
        <StatCard label="Open Positions"    value={stats.openJobPostings}      icon={Briefcase}     color="text-indigo-600" href={`/${orgSlug}/recruitment/jobs`} />
        <StatCard label="Pending Expenses"  value={stats.pendingExpenses}      icon={DollarSign}    color="text-emerald-600" href={`/${orgSlug}/expenses`} alert />
        <StatCard label="Expiring Contracts" value={stats.expiringContracts}   icon={AlertTriangle} color="text-orange-600" alert />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Attendance trend bar chart */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 text-sm mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-400" /> Attendance — Last 7 Days
          </h3>
          {stats.attendanceChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.attendanceChartData} barSize={14} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip
                  contentStyle={{ fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 8, boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  cursor={{ fill: "#f8fafc" }}
                />
                <Bar dataKey="present"  name="Present"  fill="#22c55e" radius={[3,3,0,0]} />
                <Bar dataKey="late"     name="Late"     fill="#f59e0b" radius={[3,3,0,0]} />
                <Bar dataKey="absent"   name="Absent"   fill="#ef4444" radius={[3,3,0,0]} />
                <Bar dataKey="onLeave"  name="On Leave" fill="#6366f1" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-300 text-sm">No attendance data yet</div>
          )}
        </div>

        {/* Leave by type pie chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 text-sm mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" /> Leave This Month
          </h3>
          {stats.leaveChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={stats.leaveChartData}
                  dataKey="days"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  outerRadius={70}
                  innerRadius={40}
                >
                  {stats.leaveChartData.map((_: any, i: number) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => [`${v} days`, ""]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-300 text-sm">No leave data this month</div>
          )}
        </div>
      </div>

      {/* Bottom widgets row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent hires */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 text-sm">Recent Hires</h3>
            <Link href={`/${orgSlug}/employees`} className="text-xs text-blue-500 hover:text-blue-600 font-medium">View all</Link>
          </div>
          {stats.recentHires.length === 0 ? (
            <p className="text-slate-300 text-sm text-center py-6">No recent hires</p>
          ) : (
            <div className="space-y-3">
              {stats.recentHires.map((emp: any) => (
                <Link key={emp.id} href={`/${orgSlug}/employees/${emp.id}`} className="flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs shrink-0">
                    {emp.firstName[0]}{emp.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                      {emp.firstName} {emp.lastName}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{emp.position?.title ?? "—"}</p>
                  </div>
                  <p className="text-xs text-slate-400 shrink-0">
                    {new Date(emp.hireDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming birthdays */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 text-sm">Birthdays Soon 🎂</h3>
            <span className="text-xs text-slate-400">Next 14 days</span>
          </div>
          {stats.birthdaysThisWeek.length === 0 ? (
            <p className="text-slate-300 text-sm text-center py-6">No birthdays coming up</p>
          ) : (
            <div className="space-y-3">
              {stats.birthdaysThisWeek.map((emp: any) => {
                const dob    = new Date(emp.dateOfBirth);
                const today  = new Date();
                const next   = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
                const days   = Math.ceil((next.getTime() - today.getTime()) / 86400000);
                return (
                  <div key={emp.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-semibold text-xs shrink-0">
                      {emp.firstName[0]}{emp.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {emp.firstName} {emp.lastName}
                      </p>
                      <p className="text-xs text-slate-400">
                        {dob.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", days === 0 ? "bg-pink-100 text-pink-600" : "bg-slate-100 text-slate-500")}>
                      {days === 0 ? "Today!" : `${days}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payroll status */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 text-sm">Payroll — This Month</h3>
            <Link href={`/${orgSlug}/payroll`} className="text-xs text-blue-500 hover:text-blue-600 font-medium">Manage</Link>
          </div>
          {stats.payrollCurrentMonth ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Status</span>
                <StatusBadge status={stats.payrollCurrentMonth.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Employees</span>
                <span className="text-sm font-semibold text-slate-700">{stats.payrollCurrentMonth._count.payrollItems}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Period</span>
                <span className="text-sm font-semibold text-slate-700">
                  {MONTHS[stats.payrollCurrentMonth.month - 1]} {stats.payrollCurrentMonth.year}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-slate-400 text-sm mb-3">No payroll processed yet</p>
              <Link href={`/${orgSlug}/payroll`}>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                  Process Payroll
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT:            "bg-slate-100 text-slate-600",
    PENDING_APPROVAL: "bg-yellow-100 text-yellow-700",
    APPROVED:         "bg-blue-100 text-blue-700",
    PROCESSING:       "bg-indigo-100 text-indigo-700",
    PAID:             "bg-green-100 text-green-700",
    CANCELLED:        "bg-red-100 text-red-600",
  };
  return (
    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", styles[status] ?? "bg-slate-100 text-slate-600")}>
      {status.replace("_", " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
    </span>
  );
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
