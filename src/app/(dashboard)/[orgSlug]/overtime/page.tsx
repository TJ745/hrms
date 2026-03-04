import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOvertimePolicies } from "@/actions/features.actions";
import { OvertimeClient } from "@/components/modules/overtime/overtime-client";

export default async function OvertimePage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { organizationId: true, systemRole: true },
  });
  if (!user?.organizationId) redirect("/select-org");

  const isHR = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"].includes(user.systemRole);
  if (!isHR) redirect(`/${orgSlug}/dashboard`);

  const policies = await getOvertimePolicies(user.organizationId);

  const serialized = policies.map(p => ({
    ...p,
    rateMultiplier: Number(p.rateMultiplier),
    afterHours:     Number(p.afterHours),
    maxHoursPerDay: p.maxHoursPerDay ? Number(p.maxHoursPerDay) : null,
    createdAt:      p.createdAt.toISOString(),
    updatedAt:      p.updatedAt.toISOString(),
  }));

  return <OvertimeClient policies={serialized as any} organizationId={user.organizationId} orgSlug={orgSlug} />;
}
