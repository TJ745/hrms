import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkSchedules, getShiftRoster } from "@/actions/features.actions";
import { ShiftsClient } from "@/components/modules/shifts/shifts-client";

export default async function ShiftsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
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

  // Get monday of current week
  const today     = new Date();
  const dayOfWeek = today.getDay();
  const monday    = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const weekStart = monday.toISOString().split("T")[0];

  const [schedules, roster, employees] = await Promise.all([
    getWorkSchedules(user.organizationId),
    getShiftRoster(user.organizationId, weekStart),
    prisma.employee.findMany({
      where:   { organizationId: user.organizationId, status: { in: ["ACTIVE", "PROBATION"] } },
      select:  { id: true, firstName: true, lastName: true, employeeCode: true, avatar: true, department: { select: { name: true } } },
      orderBy: { firstName: "asc" },
    }),
  ]);

  const serializeRoster = roster.map(r => ({
    ...r,
    date:      r.date.toISOString().split("T")[0],
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <ShiftsClient
      schedules={schedules as any}
      roster={serializeRoster as any}
      employees={employees}
      weekStart={weekStart}
      organizationId={user.organizationId}
      orgSlug={orgSlug}
    />
  );
}
