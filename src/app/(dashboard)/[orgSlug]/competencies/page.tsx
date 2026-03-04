import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompetencies, getEmployeeCompetencies } from "@/actions/features.actions";
import { CompetenciesClient } from "@/components/modules/competencies/competencies-client";

export default async function CompetenciesPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { organizationId: true, systemRole: true },
  });
  if (!user?.organizationId) redirect("/select-org");

  const isHR = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"].includes(user.systemRole);

  const [competencies, employeeCompetencies, employees] = await Promise.all([
    getCompetencies(),
    getEmployeeCompetencies(user.organizationId),
    isHR ? prisma.employee.findMany({
      where:   { organizationId: user.organizationId, status: { in: ["ACTIVE", "PROBATION"] } },
      select:  { id: true, firstName: true, lastName: true, employeeCode: true, avatar: true, department: { select: { name: true } } },
      orderBy: { firstName: "asc" },
    }) : Promise.resolve([]),
  ]);

  const serialize = (items: any[]) => items.map(i => ({ ...i, createdAt: i.createdAt?.toISOString?.() ?? i.createdAt, assessedAt: i.assessedAt?.toISOString?.() ?? i.assessedAt }));

  return (
    <CompetenciesClient
      competencies={serialize(competencies) as any}
      employeeCompetencies={serialize(employeeCompetencies) as any}
      employees={employees}
      isHR={isHR}
      orgSlug={orgSlug}
    />
  );
}
