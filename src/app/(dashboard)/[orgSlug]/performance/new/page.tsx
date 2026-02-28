import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewReviewForm } from "@/components/modules/performance/new-review-form";

export default async function NewReviewPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where:   { id: session.user.id },
    include: { employee: true },
  });
  if (!user?.organizationId) redirect("/select-org");

  const isHR = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"].includes(user.systemRole);
  if (!isHR) redirect(`/${orgSlug}/performance`);

  const employees = await prisma.employee.findMany({
    where:   { organizationId: user.organizationId, status: "ACTIVE" },
    select:  {
      id:           true,
      firstName:    true,
      lastName:     true,
      employeeCode: true,
      position:     { select: { title: true } },
      department:   { select: { name: true } },
    },
    orderBy: { firstName: "asc" },
  });

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">New Performance Review</h1>
        <p className="text-sm text-slate-500 mt-0.5">Start a performance review for an employee</p>
      </div>
      <NewReviewForm
        employees={employees}
        currentEmployeeId={user.employee?.id ?? null}
        organizationId={user.organizationId}
        orgSlug={orgSlug}
      />
    </div>
  );
}
