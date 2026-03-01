import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getHeadcountReport,
  getAttendanceReport,
  getLeaveReport,
  getPayrollReport,
  getRecruitmentReport,
} from "@/actions/reports.actions";
import { ReportsClient } from "@/components/modules/reports/reports-client";

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
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

  const [headcount, attendance, leave, payroll, recruitment] = await Promise.all([
    getHeadcountReport(user.organizationId),
    getAttendanceReport(user.organizationId),
    getLeaveReport(user.organizationId),
    getPayrollReport(user.organizationId),
    getRecruitmentReport(user.organizationId),
  ]);

  return (
    <ReportsClient
      headcount={headcount}
      attendance={attendance}
      leave={leave}
      payroll={payroll}
      recruitment={recruitment}
      organizationId={user.organizationId}
      orgSlug={orgSlug}
    />
  );
}
