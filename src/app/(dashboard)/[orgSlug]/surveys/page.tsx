import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSurveys } from "@/actions/features.actions";
import { SurveysClient } from "@/components/modules/surveys/surveys-client";

export default async function SurveysPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { organizationId: true, systemRole: true, employee: { select: { id: true } } },
  });
  if (!user?.organizationId) redirect("/select-org");

  const isHR = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"].includes(user.systemRole);
  const surveys = await getSurveys(user.organizationId);

  // Check which surveys the employee has already responded to
  const respondedIds = user.employee
    ? (await prisma.surveyResponse.findMany({
        where:  { employeeId: user.employee.id },
        select: { surveyId: true },
      })).map(r => r.surveyId)
    : [];

  const serialized = surveys.map(s => ({
    ...s,
    questions: s.questions as any,
    deadline:  s.deadline?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));

  return (
    <SurveysClient
      surveys={serialized as any}
      isHR={isHR}
      employeeId={user.employee?.id ?? null}
      respondedIds={respondedIds}
      organizationId={user.organizationId}
      orgSlug={orgSlug}
    />
  );
}
