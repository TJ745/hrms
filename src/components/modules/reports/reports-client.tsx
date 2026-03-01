"use client";

import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, LineChart, Line,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  Users, Clock, Calendar, DollarSign,
  Briefcase, TrendingUp, TrendingDown, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899","#84cc16"];

type Props = {
  headcount:   any;
  attendance:  any;
  leave:       any;
  payroll:     any;
  recruitment: any;
  organizationId: string;
  orgSlug:     string;
};

const TABS = [
  { key: "headcount",   label: "Headcount",   icon: Users },
  { key: "attendance",  label: "Attendance",  icon: Clock },
  { key: "leave",       label: "Leave",       icon: Calendar },
  { key: "payroll",     label: "Payroll",     icon: DollarSign },
  { key: "recruitment", label: "Recruitment", icon: Briefcase },
];

function StatCard({ label, value, sub, icon: Icon, color, bg }: any) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", bg)}>
        <Icon className={cn("w-5 h-5", color)} />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className={cn("text-2xl font-bold tabular-nums", color)}>{value}</p>
        {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-slate-700 mb-3">{children}</h3>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4">{title}</h4>
      {children}
    </div>
  );
}

export function ReportsClient({ headcount, attendance, leave, payroll, recruitment, orgSlug }: Props) {
  const [tab, setTab] = useState("headcount");

  const totalEmployees = headcount.byStatus.reduce((s: number, b: any) => s + b.count, 0);
  const activeEmployees = headcount.byStatus.find((s: any) => s.name === "ACTIVE")?.count ?? 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Reports & Analytics</h1>
        <p className="text-sm text-slate-500 mt-0.5">Organisation-wide insights across all HR modules</p>
      </div>

      {/* Tab nav */}
      <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── HEADCOUNT ── */}
      {tab === "headcount" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Employees"  value={totalEmployees}  icon={Users}        color="text-slate-700"  bg="bg-slate-50" />
            <StatCard label="Active"            value={activeEmployees} icon={TrendingUp}   color="text-green-600"  bg="bg-green-50" />
            <StatCard label="Departments"       value={headcount.byDepartment.length} icon={BarChart3} color="text-blue-600" bg="bg-blue-50" />
            <StatCard label="Branches"          value={headcount.byBranch.length}     icon={Briefcase} color="text-purple-600" bg="bg-purple-50" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard title="By Department">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={headcount.byDepartment} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Employees" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="By Status">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={headcount.byStatus} cx="50%" cy="50%" outerRadius={80} dataKey="count" nameKey="name" label={({ name, count }) => `${name}: ${count}`} labelLine={false}>
                    {headcount.byStatus.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Employment Type">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={headcount.byEmploymentType} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="count" nameKey="name">
                    {headcount.byEmploymentType.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            {headcount.monthlyHires.length > 0 && (
              <ChartCard title="Hiring Trend (Last 12 Months)">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={headcount.monthlyHires}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                    <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: "#3b82f6" }} name="New Hires" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>
        </div>
      )}

      {/* ── ATTENDANCE ── */}
      {tab === "attendance" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Report Period"    value={attendance.month}          icon={Calendar}     color="text-slate-700"  bg="bg-slate-50" />
            <StatCard label="Avg Work Hours"   value={`${attendance.avgWorkHours}h`} icon={Clock}   color="text-blue-600"   bg="bg-blue-50" />
            <StatCard label="Total Records"    value={attendance.totalRecords}   icon={Users}        color="text-green-600"  bg="bg-green-50" />
          </div>

          <ChartCard title="Attendance by Status">
            {attendance.byStatus.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-10">No attendance data for this period</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={attendance.byStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Days">
                    {attendance.byStatus.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      )}

      {/* ── LEAVE ── */}
      {tab === "leave" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Year"         value={leave.year}  icon={Calendar}  color="text-slate-700"  bg="bg-slate-50" />
            <StatCard label="Total Requests" value={leave.byStatus.reduce((s: number, b: any) => s + b.count, 0)} icon={Users} color="text-blue-600" bg="bg-blue-50" />
            <StatCard label="Total Days"   value={leave.byType.reduce((s: number, b: any) => s + b.days, 0)} icon={TrendingDown} color="text-orange-600" bg="bg-orange-50" sub="approved days" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard title="Leave by Type">
              {leave.byType.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-10">No leave data for this year</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={leave.byType}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                    <Bar dataKey="days" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Days" />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Requests" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Leave Status Breakdown">
              {leave.byStatus.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-10">No data</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={leave.byStatus} cx="50%" cy="50%" outerRadius={80} dataKey="count" nameKey="name" label={({ name, count }) => `${name}: ${count}`}>
                      {leave.byStatus.map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {leave.byMonth.length > 0 && (
              <ChartCard title="Monthly Leave Trend">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={leave.byMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                    <Bar dataKey="days" fill="#10b981" radius={[4, 4, 0, 0]} name="Days" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>
        </div>
      )}

      {/* ── PAYROLL ── */}
      {tab === "payroll" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              label="Total Gross"
              value={`$${Math.round(payroll.totalGross).toLocaleString()}`}
              icon={DollarSign}
              color="text-slate-700"
              bg="bg-slate-50"
              sub={`FY ${payroll.year}`}
            />
            <StatCard
              label="Total Net Paid"
              value={`$${Math.round(payroll.totalNet).toLocaleString()}`}
              icon={TrendingUp}
              color="text-green-600"
              bg="bg-green-50"
            />
            <StatCard
              label="Total Deductions"
              value={`$${Math.round(payroll.totalDeductions).toLocaleString()}`}
              icon={TrendingDown}
              color="text-red-500"
              bg="bg-red-50"
            />
          </div>

          <ChartCard title="Monthly Payroll Cost">
            {payroll.monthly.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-10">No payroll data for this year</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={payroll.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                    formatter={(v: any) => [`$${Number(v).toLocaleString()}`, ""]}
                  />
                  <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="gross"  fill="#3b82f6" radius={[4, 4, 0, 0]} name="Gross" />
                  <Bar dataKey="net"    fill="#10b981" radius={[4, 4, 0, 0]} name="Net" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {payroll.monthly.length > 0 && (
            <ChartCard title="Headcount per Payroll Run">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={payroll.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  <Line type="monotone" dataKey="headcount" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} name="Employees Paid" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>
      )}

      {/* ── RECRUITMENT ── */}
      {tab === "recruitment" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Total Applicants" value={recruitment.totalApplicants} icon={Users}     color="text-slate-700" bg="bg-slate-50" />
            <StatCard label="Open Positions"   value={recruitment.openPositions}   icon={Briefcase} color="text-blue-600"  bg="bg-blue-50" />
            <StatCard
              label="Hired"
              value={recruitment.byStatus.find((s: any) => s.name === "HIRED")?.count ?? 0}
              icon={TrendingUp}
              color="text-green-600"
              bg="bg-green-50"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard title="Applications by Status">
              {recruitment.byStatus.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-10">No recruitment data</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={recruitment.byStatus} cx="50%" cy="50%" outerRadius={90} dataKey="count" nameKey="name" label={({ name, count }) => `${name}: ${count}`} labelLine={false}>
                      {recruitment.byStatus.map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Applications per Job">
              {recruitment.byJob.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-10">No data</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={recruitment.byJob} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Applicants" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
}
