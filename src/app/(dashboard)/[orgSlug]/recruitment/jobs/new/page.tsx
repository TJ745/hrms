import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewJobPostingForm } from "@/components/modules/recruitment/new-job-posting-form";

export default async function NewJobPostingPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { organizationId: true, branchId: true, systemRole: true },
  });
  if (!user?.organizationId) redirect("/select-org");

  const [departments, branches] = await Promise.all([
    prisma.department.findMany({
      where:   { organizationId: user.organizationId, isActive: true },
      select:  { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.branch.findMany({
      where:   { organizationId: user.organizationId, isActive: true },
      select:  { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Post a Job</h1>
        <p className="text-sm text-slate-500 mt-0.5">Create a new job posting to attract candidates</p>
      </div>
      <NewJobPostingForm
        organizationId={user.organizationId}
        departments={departments}
        branches={branches}
        orgSlug={orgSlug}
      />
    </div>
  );
}
