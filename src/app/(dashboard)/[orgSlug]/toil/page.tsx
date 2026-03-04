import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTOILBalances, getMyTOILBalance } from "@/actions/features.actions";
import { TOILClient } from "@/components/modules/toil/toil-client";

export default async function TOILPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { organizationId: true, systemRole: true, employee: { select: { id: true } } },
  });
  if (!user?.organizationId) redirect("/select-org");

  const isHR = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"].includes(user.systemRole);

  if (isHR) {
    const balances = await getTOILBalances(user.organizationId);
    const employees = await prisma.employee.findMany({
      where:   { organizationId: user.organizationId, status: { in: ["ACTIVE", "PROBATION"] } },
      select:  { id: true, firstName: true, lastName: true, employeeCode: true, avatar: true, department: { select: { name: true } } },
      orderBy: { firstName: "asc" },
    });

    const serialized = balances.map(b => ({
      ...b,
      hoursEarned: Number(b.hoursEarned),
      hoursUsed:   Number(b.hoursUsed),
      expiresAt:   b.expiresAt?.toISOString() ?? null,
      createdAt:   b.createdAt.toISOString(),
      updatedAt:   b.updatedAt.toISOString(),
    }));

    return <TOILClient isHR balances={serialized as any} employees={employees} myBalance={null} orgSlug={orgSlug} />;
  }

  // Employee view
  const myBalance = user.employee ? await getMyTOILBalance(user.employee.id) : null;
  const serialized = myBalance ? {
    ...myBalance,
    hoursEarned: Number(myBalance.hoursEarned),
    hoursUsed:   Number(myBalance.hoursUsed),
    expiresAt:   myBalance.expiresAt?.toISOString() ?? null,
    createdAt:   myBalance.createdAt.toISOString(),
    updatedAt:   myBalance.updatedAt.toISOString(),
  } : null;

  return <TOILClient isHR={false} balances={[]} employees={[]} myBalance={serialized as any} orgSlug={orgSlug} />;
}
