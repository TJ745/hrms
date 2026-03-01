// import { headers } from "next/headers";
// import { redirect } from "next/navigation";
// import { auth } from "@/lib/auth";
// import { prisma } from "@/lib/prisma";
// import { LeaveCalendarClient } from "@/components/modules/leave/leave-calendar-client";

// export default async function LeaveCalendarPage({
//   params,
// }: {
//   params: Promise<{ orgSlug: string }>;
// }) {
//   const { orgSlug } = await params;
//   const session = await auth.api.getSession({ headers: await headers() });
//   if (!session) redirect("/login");

//   const user = await prisma.user.findUnique({
//     where:  { id: session.user.id },
//     select: {
//       organizationId: true,
//       systemRole:     true,
//       employee:       { select: { id: true } },
//     },
//   });
//   if (!user?.organizationId) redirect("/select-org");

//   const isHR = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"].includes(user.systemRole);

//   // Get approved/pending leave requests for current year
//   const year      = new Date().getFullYear();
//   const startDate = new Date(year, 0, 1);
//   const endDate   = new Date(year, 11, 31);

//   const [leaveRequests, holidays] = await Promise.all([
//     prisma.leaveRequest.findMany({
//       where: {
//         employee:  { organizationId: user.organizationId },
//         status:    { in: ["APPROVED", "PENDING"] },
//         startDate: { lte: endDate },
//         endDate:   { gte: startDate },
//         ...(isHR ? {} : { employeeId: user.employee?.id }),
//       },
//       include: {
//         employee:  { select: { firstName: true, lastName: true, avatar: true } },
//         leaveType: { select: { name: true, color: true } },
//       },
//       orderBy: { startDate: "asc" },
//     }),
//     prisma.holiday.findMany({
//       where: {
//         organizationId: user.organizationId,
//         date: { gte: startDate, lte: endDate },
//       },
//       orderBy: { date: "asc" },
//     }),
//   ]);

//   return (
//     <LeaveCalendarClient
//       leaveRequests={leaveRequests as any}
//       holidays={holidays as any}
//       isHR={isHR}
//       orgSlug={orgSlug}
//     />
//   );
// }

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeaveCalendarClient } from "@/components/modules/leave/leave-calendar-client";

export default async function LeaveCalendarPage({
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

  const isHR = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"].includes(
    user.systemRole,
  );

  // Get approved/pending leave requests for current year
  const year = new Date().getFullYear();
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  const [leaveRequests, holidays] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: {
        employee: { organizationId: user.organizationId },
        status: { in: ["APPROVED", "PENDING"] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
        ...(isHR ? {} : { employeeId: user.employee?.id }),
      },
      include: {
        employee: { select: { firstName: true, lastName: true, avatar: true } },
        leaveType: { select: { name: true, color: true } },
      },
      orderBy: { startDate: "asc" },
    }),
    prisma.holiday.findMany({
      where: {
        organizationId: user.organizationId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: "asc" },
    }),
  ]);

  // Serialize Date objects to strings for the client component
  const serializedLeaveRequests = leaveRequests.map((lr) => ({
    ...lr,
    startDate: lr.startDate.toISOString().split("T")[0],
    endDate: lr.endDate.toISOString().split("T")[0],
    createdAt: lr.createdAt.toISOString(),
    updatedAt: lr.updatedAt.toISOString(),
  }));

  const serializedHolidays = holidays.map((h) => ({
    ...h,
    date: h.date.toISOString().split("T")[0],
    createdAt: h.createdAt.toISOString(),
    // updatedAt: h.updatedAt.toISOString(),
  }));

  return (
    <LeaveCalendarClient
      leaveRequests={serializedLeaveRequests as any}
      holidays={serializedHolidays as any}
      isHR={isHR}
      orgSlug={orgSlug}
    />
  );
}
