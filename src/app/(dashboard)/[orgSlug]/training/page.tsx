import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTrainings, getEmployeeCertifications } from "@/actions/workforce.actions";
import { TrainingClient } from "@/components/modules/training/training-client";

export default async function TrainingPage({
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
      organizationId: true,
      systemRole:     true,
      employee:       { select: { id: true } },
    },
  });
  if (!user?.organizationId) redirect("/select-org");

  const isHR = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"].includes(user.systemRole);

  const [trainings, employees, myCerts] = await Promise.all([
    getTrainings(user.organizationId),
    isHR
      ? prisma.employee.findMany({
          where:   { organizationId: user.organizationId, status: { in: ["ACTIVE", "PROBATION"] } },
          select:  { id: true, firstName: true, lastName: true, employeeCode: true },
          orderBy: { firstName: "asc" },
        })
      : Promise.resolve([]),
    user.employee
      ? getEmployeeCertifications(user.employee.id)
      : Promise.resolve([]),
  ]);

  // For HR: get all enrollments with employee info
  const allEnrollments = isHR
    ? await prisma.trainingEnrollment.findMany({
        where:   { training: { organizationId: user.organizationId } },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
          training: { select: { title: true } },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  // For employee: their own enrollments
  const myEnrollments = user.employee
    ? await prisma.trainingEnrollment.findMany({
        where:   { employeeId: user.employee.id },
        include: { training: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <TrainingClient
      trainings={trainings as any}
      employees={employees}
      allEnrollments={allEnrollments as any}
      myEnrollments={myEnrollments as any}
      myCerts={myCerts as any}
      isHR={isHR}
      currentEmployeeId={user.employee?.id ?? null}
      organizationId={user.organizationId}
      orgSlug={orgSlug}
    />
  );
}
