import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPerformanceReview } from "@/actions/performance.actions";
import { ReviewEditor } from "@/components/modules/performance/review-editor";
import { GoalsPanel } from "@/components/modules/performance/goals-panel";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  DRAFT:       "bg-slate-100 text-slate-600",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  COMPLETED:   "bg-green-100 text-green-700",
};

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; reviewId: string }>;
}) {
  const { orgSlug, reviewId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where:   { id: session.user.id },
    include: { employee: true },
  });
  if (!user?.organizationId) redirect("/select-org");

  const review = await getPerformanceReview(reviewId, user.organizationId);
  if (!review) notFound();

  const isHR       = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"].includes(user.systemRole);
  const isReviewer = user.employee?.id === review.reviewerId;
  const isEmployee = user.employee?.id === review.employeeId;
  const canEdit    = isHR || isReviewer;

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link href={`/${orgSlug}/performance`}>
          <Button variant="ghost" size="sm" className="text-slate-500 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Reviews
          </Button>
        </Link>
        <span className={cn("text-xs font-semibold px-3 py-1.5 rounded-full", STATUS_STYLES[review.status])}>
          {review.status.replace("_", " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
        </span>
      </div>

      {/* Employee card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg shrink-0">
              {review.employee.firstName[0]}{review.employee.lastName[0]}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {review.employee.firstName} {review.employee.lastName}
              </h2>
              <p className="text-slate-500 text-sm mt-0.5">
                {review.employee.position?.title && `${review.employee.position.title} · `}
                {review.employee.department?.name && `${review.employee.department.name} · `}
                {review.employee.branch?.name}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {review.employee.employeeCode} · Period: <span className="font-medium text-slate-600">{review.period}</span>
              </p>
            </div>
          </div>
          {review.rating && (
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                {[1,2,3,4,5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "w-5 h-5",
                      star <= Math.round(Number(review.rating))
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-slate-200 fill-slate-200"
                    )}
                  />
                ))}
              </div>
              <p className="text-sm font-semibold text-slate-700 mt-1">{Number(review.rating).toFixed(1)} / 5.0</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-slate-100 text-sm">
          <div>
            <p className="text-slate-400 text-xs mb-0.5">Reviewer</p>
            <p className="font-medium text-slate-700">{review.reviewer.firstName} {review.reviewer.lastName}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-0.5">Started</p>
            <p className="font-medium text-slate-700">{formatDate(review.createdAt)}</p>
          </div>
          {review.submittedAt && (
            <div>
              <p className="text-slate-400 text-xs mb-0.5">Completed</p>
              <p className="font-medium text-slate-700">{formatDate(review.submittedAt)}</p>
            </div>
          )}
          <div>
            <p className="text-slate-400 text-xs mb-0.5">Goals</p>
            <p className="font-medium text-slate-700">{review._count?.goals ?? review.goals.length}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-0.5">Feedback</p>
            <p className="font-medium text-slate-700">{review._count?.feedback ?? review.feedback.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Review editor (left 3 cols) */}
        <div className="lg:col-span-3">
          <ReviewEditor
            review={{
              id:           review.id,
              status:       review.status,
              rating:       review.rating ? Number(review.rating) : null,
              strengths:    review.strengths,
              improvements: review.improvements,
              comments:     review.comments,
            }}
            organizationId={user.organizationId}
            canEdit={canEdit}
            orgSlug={orgSlug}
          />

          {/* Feedback section */}
          {review.feedback.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 mt-4">
              <h3 className="font-semibold text-slate-800 text-sm mb-4">360° Feedback ({review.feedback.length})</h3>
              <div className="space-y-4">
                {review.feedback.map((fb) => (
                  <div key={fb.id} className="border border-slate-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-slate-700">
                        {fb.isAnonymous ? "Anonymous" : `${fb.giver.firstName} ${fb.giver.lastName}`}
                      </p>
                      {fb.rating && (
                        <div className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map((s) => (
                            <Star key={s} className={cn("w-3.5 h-3.5", s <= Math.round(Number(fb.rating)) ? "text-yellow-400 fill-yellow-400" : "text-slate-200 fill-slate-200")} />
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{fb.feedback}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Goals panel (right 2 cols) */}
        <div className="lg:col-span-2">
          <GoalsPanel
            goals={review.goals}
            reviewId={review.id}
            employeeId={review.employeeId}
            organizationId={user.organizationId}
            canEdit={canEdit || isEmployee}
          />
        </div>
      </div>
    </div>
  );
}
