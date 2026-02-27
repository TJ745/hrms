import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PrintButton } from "@/components/modules/payroll/print-button";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default async function PayslipDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; payslipId: string }>;
}) {
  const { orgSlug, payslipId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { organization: true },
  });
  if (!user?.organization) redirect("/select-org");

  const slip = await prisma.payrollItem.findUnique({
    where: { id: payslipId },
    include: {
      payroll: {
        select: { month: true, year: true, currency: true, status: true },
      },
      lineItems: true,
      employee: {
        select: {
          firstName: true,
          lastName: true,
          employeeCode: true,
          position: { select: { title: true } },
          department: { select: { name: true } },
          branch: { select: { name: true } },
          user: { select: { email: true } },
        },
      },
    },
  });

  if (!slip || slip.payroll.status !== "PAID") notFound();

  const allowances = slip.lineItems.filter(
    (l) => l.type === "ALLOWANCE" || l.type === "BONUS",
  );
  const deductions = slip.lineItems.filter((l) => l.type === "DEDUCTION");

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <Link href={`/${orgSlug}/payroll/payslips`}>
          <Button variant="ghost" size="sm" className="text-slate-500 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
          </Button>
        </Link>
        <PrintButton />
      </div>

      {/* Payslip card */}
      <div
        className="bg-white rounded-xl border border-slate-200 overflow-hidden print:shadow-none"
        id="payslip"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg">PAYSLIP</h2>
              <p className="text-slate-400 text-sm mt-0.5">
                {MONTHS[slip.payroll.month - 1]} {slip.payroll.year}
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-300 text-sm">{user.organization.name}</p>
            </div>
          </div>
        </div>

        {/* Employee info */}
        <div className="px-6 py-4 border-b border-slate-100 grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <InfoRow
              label="Employee Name"
              value={`${slip.employee.firstName} ${slip.employee.lastName}`}
            />
            <InfoRow label="Employee Code" value={slip.employee.employeeCode} />
            <InfoRow
              label="Position"
              value={slip.employee.position?.title ?? "—"}
            />
          </div>
          <div className="space-y-2">
            <InfoRow
              label="Department"
              value={slip.employee.department?.name ?? "—"}
            />
            <InfoRow label="Branch" value={slip.employee.branch.name} />
            <InfoRow label="Email" value={slip.employee.user.email} />
          </div>
        </div>

        {/* Attendance */}
        <div className="px-6 py-4 border-b border-slate-100 grid grid-cols-3 gap-4 text-sm">
          <InfoRow label="Working Days" value={String(slip.workingDays)} />
          <InfoRow label="Days Present" value={String(slip.presentDays)} />
          <InfoRow
            label="Overtime Hrs"
            value={`${Number(slip.overtimeHours).toFixed(1)}h`}
          />
        </div>

        {/* Earnings & Deductions */}
        <div className="grid grid-cols-2 divide-x divide-slate-100">
          {/* Earnings */}
          <div className="px-6 py-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Earnings
            </p>
            <div className="space-y-2 text-sm">
              <PayRow
                label="Basic Salary"
                value={formatCurrency(Number(slip.basicSalary), slip.currency)}
              />
              {Number(slip.overtimePay) > 0 && (
                <PayRow
                  label="Overtime Pay"
                  value={formatCurrency(
                    Number(slip.overtimePay),
                    slip.currency,
                  )}
                />
              )}
              {allowances.map((a) => (
                <PayRow
                  key={a.id}
                  label={a.name}
                  value={formatCurrency(Number(a.amount), slip.currency)}
                />
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-sm font-semibold text-slate-800">
              <span>Gross Pay</span>
              <span>
                {formatCurrency(Number(slip.grossSalary), slip.currency)}
              </span>
            </div>
          </div>

          {/* Deductions */}
          <div className="px-6 py-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Deductions
            </p>
            <div className="space-y-2 text-sm">
              {deductions.length === 0 ? (
                <p className="text-slate-400 text-sm">No deductions</p>
              ) : (
                deductions.map((d) => (
                  <PayRow
                    key={d.id}
                    label={d.name}
                    value={`–${formatCurrency(Number(d.amount), slip.currency)}`}
                    negative
                  />
                ))
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-sm font-semibold text-red-500">
              <span>Total Deductions</span>
              <span>
                –{formatCurrency(Number(slip.totalDeductions), slip.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Net pay */}
        <div className="bg-green-50 border-t border-green-200 px-6 py-4 flex items-center justify-between">
          <p className="font-bold text-slate-900 text-base">Net Pay</p>
          <p className="font-bold text-green-600 text-2xl tabular-nums">
            {formatCurrency(Number(slip.netSalary), slip.currency)}
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-slate-800 text-right">{value}</span>
    </div>
  );
}

function PayRow({
  label,
  value,
  negative,
}: {
  label: string;
  value: string;
  negative?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className={negative ? "text-red-500" : "text-slate-700"}>
        {value}
      </span>
    </div>
  );
}
