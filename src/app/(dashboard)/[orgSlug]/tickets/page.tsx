import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTickets } from "@/actions/workforce.actions";
import { TicketsClient } from "@/components/modules/tickets/tickets-client";

export default async function TicketsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: {
      id:             true,
      organizationId: true,
      systemRole:     true,
      employee:       { select: { id: true } },
    },
  });
  if (!user?.organizationId) redirect("/select-org");

  const isHR = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"].includes(user.systemRole);

  const tickets = await getTickets({
    organizationId: user.organizationId,
    employeeId:     isHR ? undefined : (user.employee?.id ?? undefined),
  });

  // HR agents list for assignment
  const agents = isHR
    ? await prisma.user.findMany({
        where: {
          organizationId: user.organizationId,
          systemRole:     { in: ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"] },
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <TicketsClient
      tickets={tickets as any}
      agents={agents}
      isHR={isHR}
      currentUserId={user.id}
      currentEmployeeId={user.employee?.id ?? null}
      organizationId={user.organizationId}
      orgSlug={orgSlug}
    />
  );
}
