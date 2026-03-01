import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOfficialLetters } from "@/actions/hr-operations.actions";
import { LettersClient } from "@/components/modules/letters/letters-client";

export default async function LettersPage({
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
  const employeeId = isHR ? undefined : (user.employee?.id ?? undefined);

  const [letters, employees] = await Promise.all([
    getOfficialLetters({ organizationId: user.organizationId, employeeId }),
    isHR
      ? prisma.employee.findMany({
          where: { organizationId: user.organizationId, status: { notIn: ["TERMINATED"] } },
          select: { id: true, firstName: true, lastName: true, employeeCode: true },
          orderBy: { firstName: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <LettersClient
      letters={letters as any}
      employees={employees}
      isHR={isHR}
      organizationId={user.organizationId}
      orgSlug={orgSlug}
    />
  );
}
