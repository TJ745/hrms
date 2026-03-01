import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAssets } from "@/actions/hr-operations.actions";
import { AssetsClient } from "@/components/modules/assets/assets-client";

export default async function AssetsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { organizationId: true, systemRole: true, employee: { select: { id: true } } },
  });
  if (!user?.organizationId) redirect("/select-org");

  const isHR = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"].includes(user.systemRole);

  const [assets, employees] = await Promise.all([
    isHR
      ? getAssets({ organizationId: user.organizationId })
      : getAssets({ organizationId: user.organizationId, employeeId: user.employee?.id }),
    isHR
      ? prisma.employee.findMany({
          where: { organizationId: user.organizationId, status: "ACTIVE" },
          select: { id: true, firstName: true, lastName: true, employeeCode: true },
          orderBy: { firstName: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <AssetsClient
      assets={assets as any}
      employees={employees}
      isHR={isHR}
      organizationId={user.organizationId}
      orgSlug={orgSlug}
    />
  );
}
