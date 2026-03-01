import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDisciplinaryRecords } from "@/actions/hr-operations.actions";
import { DisciplinaryClient } from "@/components/modules/disciplinary/disciplinary-client";

export default async function DisciplinaryPage({
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
  if (!isHR) redirect(`/${orgSlug}/dashboard`);

  const [records, employees] = await Promise.all([
    getDisciplinaryRecords({ organizationId: user.organizationId }),
    prisma.employee.findMany({
      where: { organizationId: user.organizationId, status: { in: ["ACTIVE", "PROBATION", "SUSPENDED"] } },
      select: { id: true, firstName: true, lastName: true, employeeCode: true },
      orderBy: { firstName: "asc" },
    }),
  ]);

  return (
    <DisciplinaryClient
      records={records as any}
      employees={employees}
      organizationId={user.organizationId}
      orgSlug={orgSlug}
    />
  );
}
