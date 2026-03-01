import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getOnboardingTemplates,
  getOnboardingList,
  getEmployeeOnboarding,
} from "@/actions/workforce.actions";
import { OnboardingClient } from "@/components/modules/onboarding/onboarding-client";

export default async function OnboardingPage({
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
      employee: { select: { id: true } },
    },
  });
  if (!user?.organizationId) redirect("/select-org");

  const isHR = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"].includes(user.systemRole);

  const [templates, onboardingList, employees, myOnboarding] = await Promise.all([
    getOnboardingTemplates(user.organizationId),
    isHR ? getOnboardingList(user.organizationId) : Promise.resolve([]),
    isHR
      ? prisma.employee.findMany({
          where: {
            organizationId: user.organizationId,
            status: { in: ["ACTIVE", "PROBATION"] },
            employeeOnboarding: null,
          },
          select: { id: true, firstName: true, lastName: true, employeeCode: true },
          orderBy: { firstName: "asc" },
        })
      : Promise.resolve([]),
    !isHR && user.employee
      ? getEmployeeOnboarding(user.employee.id)
      : Promise.resolve(null),
  ]);

  return (
    <OnboardingClient
      templates={templates as any}
      onboardingList={onboardingList as any}
      employees={employees}
      myOnboarding={myOnboarding as any}
      isHR={isHR}
      organizationId={user.organizationId}
      orgSlug={orgSlug}
    />
  );
}
