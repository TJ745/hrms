import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEmployeePayslips } from "@/actions/payroll.actions";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

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

export default async function PayslipsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true, organization: true },
  });
  if (!user?.organization) redirect("/select-org");
  // if (!user?.employee)     redirect(`/${orgSlug}/dashboard`);

  const payslips = user.employee
    ? await getEmployeePayslips(user.employee.id)
    : [];

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">My Payslips</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {payslips.length} payslip{payslips.length !== 1 ? "s" : ""} available
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {payslips.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No payslips available yet</p>
          </div>
        ) : (
          payslips.map((slip) => (
            <Link
              key={slip.id}
              href={`/${orgSlug}/payroll/payslips/${slip.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-800 group-hover:text-blue-600 transition-colors">
                    {MONTHS[slip.payroll.month - 1]} {slip.payroll.year}
                  </p>
                  <p className="text-xs text-slate-400">
                    {slip.payroll.currency}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-800">
                  {formatCurrency(
                    Number(slip.netSalary),
                    slip.payroll.currency,
                  )}
                </p>
                <p className="text-xs text-slate-400">Net pay</p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
