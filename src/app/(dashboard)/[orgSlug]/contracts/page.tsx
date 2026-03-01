import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getContracts, getContractStats } from "@/actions/contract.actions";
import { ContractsClient } from "@/components/modules/contracts/contracts-client";

export default async function ContractsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where:   { id: session.user.id },
    select:  { organizationId: true, systemRole: true, employee: { select: { id: true } } },
  });
  if (!user?.organizationId) redirect("/select-org");

  const isHR      = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"].includes(user.systemRole);
  const employeeId = isHR ? undefined : (user.employee?.id ?? undefined);

  const [contracts, stats, employees] = await Promise.all([
    getContracts({ organizationId: user.organizationId, employeeId }),
    isHR ? getContractStats(user.organizationId) : Promise.resolve(null),
    isHR ? prisma.employee.findMany({
      where:   { organizationId: user.organizationId, status: "ACTIVE" },
      select:  { id: true, firstName: true, lastName: true, employeeCode: true },
      orderBy: { firstName: "asc" },
    }) : Promise.resolve([]),
  ]);

  return (
    <ContractsClient
      contracts={contracts as any}
      stats={stats}
      employees={employees as any}
      isHR={isHR}
      currentEmployeeId={user.employee?.id ?? null}
      organizationId={user.organizationId}
      orgSlug={orgSlug}
    />
  );
}
