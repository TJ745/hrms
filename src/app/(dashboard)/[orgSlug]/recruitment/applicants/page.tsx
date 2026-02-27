import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getApplications } from "@/actions/recruitment.actions";
import { ApplicantsTable } from "@/components/modules/recruitment/applicants-table";
import type { ApplicationStatus } from "@prisma/client";

export default async function ApplicantsPage({
  params,
  searchParams,
}: {
  params:       Promise<{ orgSlug: string }>;
  searchParams: Promise<{ status?: string; job?: string; search?: string; page?: string }>;
}) {
  const { orgSlug } = await params;
  const sp          = await searchParams;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { organizationId: true, systemRole: true },
  });
  if (!user?.organizationId) redirect("/select-org");

  const result = await getApplications({
    organizationId: user.organizationId,
    jobPostingId:   sp.job     || undefined,
    status:         sp.status as ApplicationStatus | undefined,
    search:         sp.search  || undefined,
    page:           sp.page ? parseInt(sp.page) : 1,
  });

  // Job filter options
  const jobs = await prisma.jobPosting.findMany({
    where:   { organizationId: user.organizationId },
    select:  { id: true, title: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Applicants</h1>
        <p className="text-sm text-slate-500 mt-0.5">{result.total} total application{result.total !== 1 ? "s" : ""}</p>
      </div>

      <ApplicantsTable
        applications={result.applications}
        jobs={jobs}
        total={result.total}
        page={result.page}
        totalPages={result.totalPages}
        orgSlug={orgSlug}
        organizationId={user.organizationId}
      />
    </div>
  );
}
