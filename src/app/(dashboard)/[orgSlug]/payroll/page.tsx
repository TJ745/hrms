import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPayrollList } from "@/actions/payroll.actions";
import { PayrollListTable } from "@/components/modules/payroll/payroll-list-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const STATUS_STYLES: Record<string, string> = {
  DRAFT:     "bg-slate-50 text-slate-600 border-slate-200",
  PENDING:   "bg-yellow-50 text-yellow-700 border-yellow-200",
  APPROVED:  "bg-blue-50 text-blue-700 border-blue-200",
  PAID:      "bg-green-50 text-green-700 border-green-200",
  CANCELLED: "bg-red-50 text-red-600 border-red-200",
};

export default async function PayrollPage({
  params,
  searchParams,
}: {
  params:       Promise<{ orgSlug: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { orgSlug } = await params;
  const sp          = await searchParams;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where:   { id: session.user.id },
    include: { organization: true },
  });
  if (!user?.organization) redirect("/select-org");

  if (!["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"].includes(user.systemRole)) {
    redirect(`/${orgSlug}/payroll/payslips`);
  }

  const year    = sp.year ? parseInt(sp.year) : new Date().getFullYear();
  const payrolls = await getPayrollList({
    organizationId: user.organization.id,
    branchId: user.systemRole === "HR_MANAGER" ? (user.branchId ?? undefined) : undefined,
    year,
  });

  const totalPaid = payrolls
    .filter(p => p.status === "PAID")
    .reduce((sum, p) => sum + p.payrollItems.reduce((s, i) => s + Number(i.netSalary), 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Payroll</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {year} · Total paid: {formatCurrency(totalPaid, "USD")}
          </p>
        </div>
        <Link href={`/${orgSlug}/payroll/process`}>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-1.5" /> Process Payroll
          </Button>
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Runs",    value: payrolls.length },
          { label: "Paid",          value: payrolls.filter(p => p.status === "PAID").length },
          { label: "Draft",         value: payrolls.filter(p => p.status === "DRAFT").length },
          { label: "Total Disbursed", value: formatCurrency(totalPaid, "USD") },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-2xl font-bold text-slate-900 mb-0.5">{card.value}</div>
            <div className="text-xs text-slate-500">{card.label}</div>
          </div>
        ))}
      </div>

      <PayrollListTable
        payrolls={payrolls}
        orgSlug={orgSlug}
        organizationId={user.organization.id}
      />
    </div>
  );
}
