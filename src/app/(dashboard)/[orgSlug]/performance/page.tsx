import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPerformanceReviews, getPerformanceSummary } from "@/actions/performance.actions";
import { PerformanceReviewsTable } from "@/components/modules/performance/performance-reviews-table";
import { Button } from "@/components/ui/button";
import { Plus, Star, ClipboardList, CheckCircle, Clock } from "lucide-react";
import type { ReviewStatus } from "@prisma/client";

export default async function PerformancePage({
  params,
  searchParams,
}: {
  params:       Promise<{ orgSlug: string }>;
  searchParams: Promise<{ status?: string; period?: string; page?: string }>;
}) {
  const { orgSlug } = await params;
  const sp          = await searchParams;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where:   { id: session.user.id },
    include: { employee: true },
  });
  if (!user?.organizationId) redirect("/select-org");

  const isHR = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"].includes(user.systemRole);

  const [result, summary] = await Promise.all([
    getPerformanceReviews({
      organizationId: user.organizationId,
      employeeId:     !isHR && user.employee ? user.employee.id : undefined,
      status:         sp.status as ReviewStatus | undefined,
      period:         sp.period || undefined,
      page:           sp.page ? parseInt(sp.page) : 1,
    }),
    isHR ? getPerformanceSummary(user.organizationId) : null,
  ]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Performance</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isHR ? "Manage performance reviews and goals" : "Your performance reviews"}
          </p>
        </div>
        {isHR && (
          <Link href={`/${orgSlug}/performance/new`}>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-1.5" /> New Review
            </Button>
          </Link>
        )}
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Reviews", value: summary.total,            icon: ClipboardList, color: "text-slate-700"  },
            { label: "In Progress",   value: summary.inProgress,       icon: Clock,         color: "text-yellow-600" },
            { label: "Completed",     value: summary.completed,        icon: CheckCircle,   color: "text-green-600"  },
            { label: "Avg Rating",    value: summary.avgRating ?? "—", icon: Star,          color: "text-blue-600"   },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500">{stat.label}</span>
                <stat.icon className={`w-4 h-4 ${stat.color} opacity-60`} />
              </div>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      <PerformanceReviewsTable
        reviews={result.reviews}
        total={result.total}
        page={result.page}
        totalPages={result.totalPages}
        orgSlug={orgSlug}
        organizationId={user.organizationId}
        isHR={isHR}
      />
    </div>
  );
}
