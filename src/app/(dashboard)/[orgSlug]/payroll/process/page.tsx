import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProcessPayrollForm } from "@/components/modules/payroll/process-payroll-form";

export default async function ProcessPayrollPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where:   { id: session.user.id },
    include: { organization: true },
  });
  if (!user?.organization) redirect("/select-org");

  if (!["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"].includes(user.systemRole)) {
    redirect(`/${orgSlug}/payroll`);
  }

  const branches = await prisma.branch.findMany({
    where:   { organizationId: user.organization.id, isActive: true },
    select:  { id: true, name: true },
  });

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Process Payroll</h1>
        <p className="text-sm text-slate-500 mt-0.5">Generate payroll for a specific period</p>
      </div>
      <ProcessPayrollForm
        organizationId={user.organization.id}
        branches={branches}
        orgSlug={orgSlug}
        userRole={user.systemRole}
        userBranchId={user.branchId}
      />
    </div>
  );
}
