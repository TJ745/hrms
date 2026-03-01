import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getHolidays } from "@/actions/hr-operations.actions";
import { HolidaysClient } from "@/components/modules/holidays/holidays-client";

export default async function HolidaysPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      organizationId: true,
      systemRole: true,
      branchId: true,
      employee: { select: { branchId: true } },
    },
  });
  if (!user?.organizationId) redirect("/select-org");

  const isHR = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"].includes(user.systemRole);
  const branchId = user.branchId ?? user.employee?.branchId ?? undefined;

  const [holidays, branches] = await Promise.all([
    getHolidays(user.organizationId, isHR ? undefined : branchId),
    isHR
      ? prisma.branch.findMany({
          where: { organizationId: user.organizationId, isActive: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <HolidaysClient
      holidays={holidays as any}
      branches={branches}
      isHR={isHR}
      organizationId={user.organizationId}
      orgSlug={orgSlug}
    />
  );
}
