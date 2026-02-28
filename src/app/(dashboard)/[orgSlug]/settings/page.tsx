import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsPageClient } from "@/components/modules/settings/settings-page-client";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { organizationId: true, systemRole: true },
  });
  if (!user?.organizationId) redirect("/select-org");

  const isAdmin = ["SUPER_ADMIN", "ORG_ADMIN"].includes(user.systemRole);
  if (!isAdmin) redirect(`/${orgSlug}`);

  const [org, payrollSettings, branches, departments, positions, leaveTypes] =
    await Promise.all([
      prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          website: true,
          address: true,
          city: true,
          country: true,
          timezone: true,
          dateFormat: true,
          defaultCurrency: true,
          defaultLanguage: true,
          fiscalYearStart: true,
          industry: true,
          companySize: true,
          registrationNumber: true,
          taxId: true,
          plan: true,
          status: true,
        },
      }),
      prisma.payrollSettings.findUnique({
        where: { organizationId: user.organizationId },
      }),
      prisma.branch.findMany({
        where: { organizationId: user.organizationId },
        select: {
          id: true,
          name: true,
          code: true,
          city: true,
          country: true,
          isHeadquarters: true,
          isActive: true,
          _count: { select: { employees: true } },
        },
        orderBy: { isHeadquarters: "desc" },
      }),
      prisma.department.findMany({
        where: { organizationId: user.organizationId },
        select: {
          id: true,
          name: true,
          code: true,
          branchId: true,
          isActive: true,
          _count: { select: { employees: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.position.findMany({
        where: { organizationId: user.organizationId },
        select: {
          id: true,
          title: true,
          code: true,
          departmentId: true,
          isActive: true,
          _count: { select: { employees: true } },
        },
        orderBy: { title: "asc" },
      }),
      prisma.leaveType.findMany({
        where: { organizationId: user.organizationId },
        orderBy: { name: "asc" },
      }),
    ]);

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage your organization configuration
        </p>
      </div>
      <SettingsPageClient
        org={org!}
        payrollSettings={payrollSettings}
        branches={branches}
        departments={departments}
        positions={positions}
        leaveTypes={leaveTypes}
        organizationId={user.organizationId}
        orgSlug={orgSlug}
      />
    </div>
  );
}
