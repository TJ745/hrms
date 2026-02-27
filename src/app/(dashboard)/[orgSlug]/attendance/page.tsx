import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAttendanceHistory, getAttendanceSummary } from "@/actions/attendance.actions";
import { AttendanceClockCard } from "@/components/modules/attendance/attendance-clock-card";
import { AttendanceTable } from "@/components/modules/attendance/attendance-table";
import { formatDate } from "@/lib/utils";

export default async function AttendancePage({
  params,
  searchParams,
}: {
  params:       Promise<{ orgSlug: string }>;
  searchParams: Promise<{ month?: string; year?: string; page?: string }>;
}) {
  const { orgSlug } = await params;
  const sp          = await searchParams;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where:   { id: session.user.id },
    include: { employee: true, organization: true },
  });
  if (!user?.organization) redirect("/select-org");

  const now   = new Date();
  const month = sp.month ? parseInt(sp.month) : now.getMonth() + 1;
  const year  = sp.year  ? parseInt(sp.year)  : now.getFullYear();

  const isHR = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"].includes(user.systemRole);

  const [history, summary] = await Promise.all([
    getAttendanceHistory({
      organizationId: user.organization.id,
      branchId:       user.systemRole === "HR_MANAGER" ? (user.branchId ?? undefined) : undefined,
      employeeId:     isHR ? undefined : (user.employee?.id ?? undefined),
      month,
      year,
      page:           sp.page ? parseInt(sp.page) : 1,
    }),
    user.employee
      ? getAttendanceSummary(user.employee.id, month, year)
      : null,
  ]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Attendance</h1>
          <p className="text-sm text-slate-500 mt-0.5">{formatDate(now)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Clock in/out card */}
        {user.employee && (
          <AttendanceClockCard
            employeeId={user.employee.id}
            orgSlug={orgSlug}
          />
        )}

        {/* Monthly summary */}
        {summary && (
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 text-sm mb-4">
              Monthly Summary — {new Date(year, month - 1).toLocaleString("default", { month: "long" })} {year}
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {[
                { label: "Present",   value: summary.summary.present,   color: "bg-green-50 text-green-700 border-green-200" },
                { label: "Absent",    value: summary.summary.absent,    color: "bg-red-50 text-red-700 border-red-200" },
                { label: "Late",      value: summary.summary.late,      color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
                { label: "Half Day",  value: summary.summary.halfDay,   color: "bg-orange-50 text-orange-700 border-orange-200" },
                { label: "On Leave",  value: summary.summary.onLeave,   color: "bg-blue-50 text-blue-700 border-blue-200" },
                { label: "Hrs Worked", value: `${summary.summary.totalHours.toFixed(1)}h`, color: "bg-slate-50 text-slate-700 border-slate-200" },
                { label: "Overtime",  value: `${summary.summary.overtime.toFixed(1)}h`,   color: "bg-purple-50 text-purple-700 border-purple-200" },
              ].map((stat) => (
                <div key={stat.label} className={`rounded-lg border p-3 text-center ${stat.color}`}>
                  <div className="text-xl font-bold">{stat.value}</div>
                  <div className="text-xs mt-0.5 opacity-80">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Attendance table */}
      <AttendanceTable
        records={history.records}
        total={history.total}
        page={history.page}
        totalPages={history.totalPages}
        month={month}
        year={year}
        orgSlug={orgSlug}
        isHR={isHR}
        organizationId={user.organization.id}
      />
    </div>
  );
}
