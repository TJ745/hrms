import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getApplication } from "@/actions/recruitment.actions";
import { Button } from "@/components/ui/button";
import { ApplicationStatusUpdater } from "@/components/modules/recruitment/application-status-updater";
import { ArrowLeft, Mail, Phone, Globe, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  APPLIED:   "bg-blue-50 text-blue-700 border-blue-200",
  SCREENING: "bg-yellow-50 text-yellow-700 border-yellow-200",
  INTERVIEW: "bg-indigo-50 text-indigo-700 border-indigo-200",
  OFFER:     "bg-green-50 text-green-700 border-green-200",
  HIRED:     "bg-green-100 text-green-800 border-green-300",
  REJECTED:  "bg-red-50 text-red-600 border-red-200",
  WITHDRAWN: "bg-slate-50 text-slate-500 border-slate-200",
};

export default async function ApplicantDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; applicationId: string }>;
}) {
  const { orgSlug, applicationId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { organizationId: true },
  });
  if (!user?.organizationId) redirect("/select-org");

  const app = await getApplication(applicationId, user.organizationId);
  if (!app) notFound();

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link href={`/${orgSlug}/recruitment/applicants`}>
          <Button variant="ghost" size="sm" className="text-slate-500 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Applicants
          </Button>
        </Link>
        <ApplicationStatusUpdater
          applicationId={app.id}
          currentStatus={app.status}
          organizationId={user.organizationId}
          orgSlug={orgSlug}
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg shrink-0">
                {app.firstName[0]}{app.lastName[0]}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{app.firstName} {app.lastName}</h2>
                <p className="text-slate-500 text-sm">Applied for <span className="font-medium text-slate-700">{app.jobPosting.title}</span></p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-slate-500">
              <a href={`mailto:${app.email}`} className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                <Mail className="w-3.5 h-3.5" /> {app.email}
              </a>
              {app.phone && (
                <a href={`tel:${app.phone}`} className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                  <Phone className="w-3.5 h-3.5" /> {app.phone}
                </a>
              )}
              {app.resumeUrl && (
                <a href={app.resumeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                  <Globe className="w-3.5 h-3.5" /> Resume
                </a>
              )}
            </div>
          </div>
          <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border", STATUS_STYLES[app.status])}>
            {app.status.charAt(0) + app.status.slice(1).toLowerCase()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 text-sm mb-4">Application Info</h3>
          <div className="space-y-3 text-sm">
            <InfoRow label="Position"   value={app.jobPosting.title} />
            <InfoRow label="Type"       value={app.jobPosting.employmentType.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())} />
            <InfoRow label="Location"   value={app.jobPosting.location} />
            <InfoRow label="Applied On" value={formatDate(app.createdAt)} />
            <InfoRow label="Source"     value={app.source?.replace("_", " ").toLowerCase()} />
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 text-sm mb-4">Cover Letter</h3>
          {app.coverLetter
            ? <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">{app.coverLetter}</p>
            : <p className="text-slate-400 text-sm italic">No cover letter provided</p>
          }
          {app.notes && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Internal Notes</h4>
              <p className="text-slate-600 text-sm leading-relaxed">{app.notes}</p>
            </div>
          )}
        </div>
      </div>

      {app.interviews.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 text-sm mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" /> Interviews ({app.interviews.length})
          </h3>
          <div className="divide-y divide-slate-100">
            {app.interviews.map((interview) => (
              <div key={interview.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold",
                    interview.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                    interview.status === "CANCELLED" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-700"
                  )}>
                    {interview.type[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {interview.type.replace("_", " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())} Interview
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatDate(interview.scheduledAt)} · {interview.duration} min
                      {interview.location && ` · ${interview.location}`}
                    </p>
                  </div>
                </div>
                <span className={cn(
                  "text-xs font-medium px-2.5 py-1 rounded-full border",
                  interview.status === "COMPLETED" ? "bg-green-50 text-green-700 border-green-200" :
                  interview.status === "CANCELLED" ? "bg-red-50 text-red-600 border-red-200" :
                  "bg-blue-50 text-blue-700 border-blue-200"
                )}>
                  {interview.status.charAt(0) + interview.status.slice(1).toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-400 shrink-0">{label}</span>
      <span className="text-slate-700 font-medium text-right">
        {value ?? <span className="text-slate-300 font-normal">—</span>}
      </span>
    </div>
  );
}
