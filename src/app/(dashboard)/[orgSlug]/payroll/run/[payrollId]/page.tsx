import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processPayroll } from "@/actions/payroll.actions";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Play, CheckCircle2 } from "lucide-react";
import { formatCurrency, getInitials, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const STATUS_STYLES: Record<string, string> = {
  DRAFT:    "bg-slate-100 text-slate-600",
  PENDING:  "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-blue-100 text-blue-700",
  PAID:     "bg-green-100 text-green-700",
};

export default async function PayrollDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; payrollId: string }>;
}) {
  const { orgSlug, payrollId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where:   { id: session.user.id },
    include: { organization: true },
  });
  if (!user?.organization) redirect("/select-org");

  const payroll = await prisma.payroll.findUnique({
    where: { id: payrollId },
    include: {
      payrollItems: {
        include: {
          employee:  { select: { id: true, firstName: true, lastName: true, avatar: true, employeeCode: true, position: { select: { title: true } }, department: { select: { name: true } } } },
          lineItems: true,
        },
        orderBy: { employee: { firstName: "asc" } },
      },
      branch: { select: { name: true } },
    },
  });

  if (!payroll || payroll.organizationId !== user.organization.id) notFound();

  const totalGross = payroll.payrollItems.reduce((s, i) => s + Number(i.grossSalary), 0);
  const totalNet   = payroll.payrollItems.reduce((s, i) => s + Number(i.netSalary),   0);
  const totalDeductions = payroll.payrollItems.reduce((s, i) => s + Number(i.totalDeductions), 0);

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href={`/${orgSlug}/payroll`}>
            <Button variant="ghost" size="sm" className="text-slate-500 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                {MONTHS[payroll.month - 1]} {payroll.year}
              </h1>
              <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", STATUS_STYLES[payroll.status])}>
                {payroll.status.charAt(0) + payroll.status.slice(1).toLowerCase()}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              {payroll.branch?.name ?? "All Branches"} · {payroll.payrollItems.length} employees
            </p>
          </div>
        </div>

        {payroll.status === "DRAFT" && (
          <form action={async () => {
            "use server";
            await processPayroll(payrollId, user.organization!.id);
          }}>
            <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">
              <Play className="w-4 h-4 mr-1.5" /> Mark as Paid
            </Button>
          </form>
        )}
        {payroll.status === "PAID" && (
          <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Paid {payroll.processedAt ? `on ${formatDate(payroll.processedAt)}` : ""}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Total Gross</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalGross, payroll.currency)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Total Deductions</p>
          <p className="text-2xl font-bold text-red-600">–{formatCurrency(totalDeductions, payroll.currency)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Total Net Pay</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalNet, payroll.currency)}</p>
        </div>
      </div>

      {/* Employee rows */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Days</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Basic</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Allowances</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Overtime</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Gross</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Deductions</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Net Pay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {payroll.payrollItems.map((item) => {
                const allowances = item.lineItems
                  .filter(l => l.type === "ALLOWANCE" || l.type === "BONUS")
                  .reduce((s, l) => s + Number(l.amount), 0);

                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={item.employee.avatar ?? undefined} />
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                            {getInitials(`${item.employee.firstName} ${item.employee.lastName}`)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-slate-800">{item.employee.firstName} {item.employee.lastName}</p>
                          <p className="text-xs text-slate-400">{item.employee.position?.title ?? item.employee.department?.name ?? item.employee.employeeCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 tabular-nums">
                      {item.presentDays}/{item.workingDays}
                    </td>
                    <td className="px-4 py-3 text-slate-700 tabular-nums">
                      {formatCurrency(Number(item.basicSalary), item.currency)}
                    </td>
                    <td className="px-4 py-3 text-slate-700 tabular-nums">
                      {allowances > 0 ? `+${formatCurrency(allowances, item.currency)}` : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-700 tabular-nums">
                      {Number(item.overtimePay) > 0
                        ? <span className="text-purple-600">+{formatCurrency(Number(item.overtimePay), item.currency)}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 tabular-nums">
                      {formatCurrency(Number(item.grossSalary), item.currency)}
                    </td>
                    <td className="px-4 py-3 text-red-500 tabular-nums">
                      {Number(item.totalDeductions) > 0
                        ? `–${formatCurrency(Number(item.totalDeductions), item.currency)}`
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 font-bold text-green-600 tabular-nums">
                      {formatCurrency(Number(item.netSalary), item.currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-slate-200 bg-slate-50">
              <tr>
                <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-slate-700">Totals</td>
                <td className="px-4 py-3 font-bold text-slate-800 tabular-nums">{formatCurrency(totalGross, payroll.currency)}</td>
                <td className="px-4 py-3 font-bold text-red-500 tabular-nums">–{formatCurrency(totalDeductions, payroll.currency)}</td>
                <td className="px-4 py-3 font-bold text-green-600 tabular-nums">{formatCurrency(totalNet, payroll.currency)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
