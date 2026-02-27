import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getJobPosting } from "@/actions/recruitment.actions";
import { Button } from "@/components/ui/button";
import { AddApplicantForm } from "@/components/modules/recruitment/add-applicant-form";
import { ArrowLeft, Users, MapPin, Clock, DollarSign, Briefcase, Calendar } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  DRAFT:  "bg-slate-100 text-slate-600",
  OPEN:   "bg-green-100 text-green-700",
  PAUSED: "bg-yellow-100 text-yellow-700",
  CLOSED: "bg-red-100 text-red-600",
};

const APP_STATUS_STYLES: Record<string, string> = {
  NEW:         "bg-blue-50 text-blue-700 border-blue-200",
  REVIEWING:   "bg-yellow-50 text-yellow-700 border-yellow-200",
  SHORTLISTED: "bg-purple-50 text-purple-700 border-purple-200",
  INTERVIEW:   "bg-indigo-50 text-indigo-700 border-indigo-200",
  OFFERED:     "bg-green-50 text-green-700 border-green-200",
  HIRED:       "bg-green-100 text-green-800 border-green-300",
  REJECTED:    "bg-red-50 text-red-600 border-red-200",
  WITHDRAWN:   "bg-slate-50 text-slate-500 border-slate-200",
};

export default async function JobPostingDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; jobId: string }>;
}) {
  const { orgSlug, jobId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { organizationId: true },
  });
  if (!user?.organizationId) redirect("/select-org");

  const job = await getJobPosting(jobId, user.organizationId);
  if (!job) notFound();

  // Pipeline counts
  const pipeline = ["NEW", "REVIEWING", "SHORTLISTED", "INTERVIEW", "OFFERED", "HIRED", "REJECTED"];
  const pipelineCounts = pipeline.map((status) => ({
    status,
    count: job.applications.filter((a) => a.status === status).length,
  }));

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link href={`/${orgSlug}/recruitment/jobs`}>
          <Button variant="ghost" size="sm" className="text-slate-500 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Link href={`/${orgSlug}/recruitment/applicants?job=${job.id}`}>
            <Button variant="outline" size="sm" className="border-slate-200">
              <Users className="w-4 h-4 mr-1.5" /> {job._count.applications} Applicants
            </Button>
          </Link>
        </div>
      </div>

      {/* Job header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <h1 className="text-xl font-bold text-slate-900">{job.title}</h1>
              <span className={cn("text-xs font-semibold px-2 py-1 rounded-full", STATUS_STYLES[job.status])}>
                {job.status.charAt(0) + job.status.slice(1).toLowerCase()}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-slate-500">
              {job.department && (
                <span className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" /> {job.department.name}
                </span>
              )}
              {job.branch && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> {job.branch.name}
                </span>
              )}
              {job.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> {job.location}{job.isRemote && " · Remote"}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {job.type.replace("_", " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
              </span>
              {job.deadline && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Deadline: {formatDate(job.deadline)}
                </span>
              )}
              {(job.salaryMin || job.salaryMax) && (
                <span className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" />
                  {job.salaryMin && job.salaryMax
                    ? `${formatCurrency(Number(job.salaryMin), job.currency)} – ${formatCurrency(Number(job.salaryMax), job.currency)}`
                    : job.salaryMin
                    ? `From ${formatCurrency(Number(job.salaryMin), job.currency)}`
                    : `Up to ${formatCurrency(Number(job.salaryMax!), job.currency)}`}
                </span>
              )}
            </div>
          </div>
          <div className="text-right text-sm text-slate-400">
            <p>{job.openings} opening{job.openings !== 1 ? "s" : ""}</p>
            <p>Posted {formatDate(job.createdAt)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: job details */}
        <div className="lg:col-span-2 space-y-4">
          {job.description && (
            <Section title="Description">
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">{job.description}</p>
            </Section>
          )}
          {job.responsibilities && (
            <Section title="Responsibilities">
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">{job.responsibilities}</p>
            </Section>
          )}
          {job.requirements && (
            <Section title="Requirements">
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">{job.requirements}</p>
            </Section>
          )}
        </div>

        {/* Right: pipeline + add applicant */}
        <div className="space-y-4">
          {/* Pipeline */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 text-sm mb-3">Pipeline</h3>
            <div className="space-y-2">
              {pipelineCounts.map(({ status, count }) => (
                <div key={status} className="flex items-center justify-between">
                  <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full border",
                    APP_STATUS_STYLES[status]
                  )}>
                    {status.charAt(0) + status.slice(1).toLowerCase()}
                  </span>
                  <span className="text-sm font-semibold text-slate-700 tabular-nums">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Add applicant manually */}
          {job.status === "OPEN" && (
            <AddApplicantForm
              jobPostingId={job.id}
              organizationId={user.organizationId}
              orgSlug={orgSlug}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="font-semibold text-slate-800 text-sm mb-3">{title}</h3>
      {children}
    </div>
  );
}
