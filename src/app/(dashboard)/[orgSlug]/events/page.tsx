import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyEvents } from "@/actions/features.actions";
import { EventsClient } from "@/components/modules/events/events-client";

export default async function EventsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { organizationId: true, systemRole: true },
  });
  if (!user?.organizationId) redirect("/select-org");

  const isHR = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"].includes(user.systemRole);

  const [events, branches, departments] = await Promise.all([
    getCompanyEvents(user.organizationId),
    isHR ? prisma.branch.findMany({ where: { organizationId: user.organizationId }, select: { id: true, name: true } }) : Promise.resolve([]),
    isHR ? prisma.department.findMany({ where: { organizationId: user.organizationId }, select: { id: true, name: true } }) : Promise.resolve([]),
  ]);

  const serialized = events.map((e) => ({
    ...e,
    startDate: e.startDate.toISOString(),
    endDate:   e.endDate.toISOString(),
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }));

  return <EventsClient events={serialized as any} branches={branches} departments={departments} isHR={isHR} organizationId={user.organizationId} orgSlug={orgSlug} />;
}
