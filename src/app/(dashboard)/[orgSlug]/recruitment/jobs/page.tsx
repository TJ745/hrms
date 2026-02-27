import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getJobPostings } from "@/actions/recruitment.actions";
import { JobPostingsTable } from "@/components/modules/recruitment/job-postings-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { JobStatus } from "@prisma/client";

export default async function RecruitmentJobsPage({
  params,
  searchParams,
}: {
  params:       Promise<{ orgSlug: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
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

  const result = await getJobPostings({
    organizationId: user.organizationId,
    status:         sp.status as JobStatus | undefined,
    page:           sp.page ? parseInt(sp.page) : 1,
  });

  const stats = await prisma.jobPosting.groupBy({
    by:     ["status"],
    where:  { organizationId: user.organizationId },
    _count: { id: true },
  });
  const statMap = Object.fromEntries(stats.map(s => [s.status, s._count.id]));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Recruitment</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage job postings and applications</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/${orgSlug}/recruitment/applicants`}>
            <Button variant="outline" size="sm" className="border-slate-200 text-slate-600">All Applicants</Button>
          </Link>
          <Link href={`/${orgSlug}/recruitment/jobs/new`}>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-1.5" /> Post Job
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Open",    value: statMap["OPEN"]    ?? 0, color: "text-green-600" },
          { label: "Draft",   value: statMap["DRAFT"]   ?? 0, color: "text-slate-500" },
          { label: "On Hold", value: statMap["ON_HOLD"] ?? 0, color: "text-yellow-600" },
          { label: "Closed",  value: statMap["CLOSED"]  ?? 0, color: "text-red-500"   },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className={`text-2xl font-bold mb-0.5 ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-slate-500">{stat.label} Positions</div>
          </div>
        ))}
      </div>

      <JobPostingsTable
        postings={result.postings}
        total={result.total}
        page={result.page}
        totalPages={result.totalPages}
        orgSlug={orgSlug}
        organizationId={user.organizationId}
      />
    </div>
  );
}
