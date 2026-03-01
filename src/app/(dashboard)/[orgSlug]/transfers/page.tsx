import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTransfers } from "@/actions/hr-operations.actions";
import { TransfersClient } from "@/components/modules/transfers/transfers-client";

export default async function TransfersPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { organizationId: true, systemRole: true, employee: { select: { id: true, branchId: true, departmentId: true, positionId: true } } },
  });
  if (!user?.organizationId) redirect("/select-org");

  const isHR = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"].includes(user.systemRole);

  const [transfers, employees, branches, departments, positions] = await Promise.all([
    getTransfers({ organizationId: user.organizationId }),
    isHR
      ? prisma.employee.findMany({
          where: { organizationId: user.organizationId, status: { in: ["ACTIVE", "PROBATION"] } },
          select: { id: true, firstName: true, lastName: true, employeeCode: true, branchId: true, departmentId: true, positionId: true },
          orderBy: { firstName: "asc" },
        })
      : Promise.resolve([]),
    prisma.branch.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      select: { id: true, name: true },
    }),
    prisma.department.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      select: { id: true, name: true, branchId: true },
    }),
    prisma.position.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      select: { id: true, title: true },
    }),
  ]);

  return (
    <TransfersClient
      transfers={transfers as any}
      employees={employees as any}
      branches={branches}
      departments={departments as any}
      positions={positions}
      isHR={isHR}
      organizationId={user.organizationId}
      orgSlug={orgSlug}
    />
  );
}
