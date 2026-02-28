"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Star, Eye } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { ReviewStatus } from "@prisma/client";

const STATUS_STYLES: Record<string, string> = {
  DRAFT:       "bg-slate-50 text-slate-600 border-slate-200",
  IN_PROGRESS: "bg-yellow-50 text-yellow-700 border-yellow-200",
  COMPLETED:   "bg-green-50 text-green-700 border-green-200",
};

type Review = {
  id:          string;
  period:      string;
  status:      ReviewStatus;
  rating:      any;
  createdAt:   Date;
  submittedAt: Date | null;
  employee:    { id: string; firstName: string; lastName: string; avatar: string | null; employeeCode: string; position: { title: string } | null; department: { name: string } | null };
  reviewer:    { id: string; firstName: string; lastName: string };
  _count:      { goals: number; feedback: number };
};

type Props = {
  reviews:        Review[];
  total:          number;
  page:           number;
  totalPages:     number;
  orgSlug:        string;
  organizationId: string;
  isHR:           boolean;
};

export function PerformanceReviewsTable({ reviews, total, page, totalPages, orgSlug, organizationId, isHR }: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const sp       = useSearchParams();
  const [, startTransition] = useTransition();

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      {/* Filters */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 flex-wrap">
        <h3 className="font-semibold text-slate-800 text-sm flex-1">
          Reviews <span className="text-slate-400 font-normal text-xs ml-2">{total} total</span>
        </h3>
        <Input
          placeholder="Filter by period..."
          defaultValue={sp.get("period") ?? ""}
          onChange={(e) => updateParam("period", e.target.value || null)}
          className="h-8 w-36 border-slate-200 text-sm"
        />
        <Select value={sp.get("status") ?? "ALL"} onValueChange={(v) => updateParam("status", v === "ALL" ? null : v)}>
          <SelectTrigger className="h-8 w-36 border-slate-200 text-sm"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              {isHR && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</th>}
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Period</th>
              {isHR && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Reviewer</th>}
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Goals</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Rating</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {reviews.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-16 text-slate-400 text-sm">No reviews found</td></tr>
            ) : (
              reviews.map((review) => (
                <tr key={review.id} className="hover:bg-slate-50/50 transition-colors">
                  {isHR && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs shrink-0">
                          {review.employee.firstName[0]}{review.employee.lastName[0]}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{review.employee.firstName} {review.employee.lastName}</p>
                          <p className="text-xs text-slate-400">{review.employee.position?.title ?? review.employee.department?.name ?? review.employee.employeeCode}</p>
                        </div>
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-3 font-medium text-slate-700">{review.period}</td>
                  {isHR && (
                    <td className="px-4 py-3 text-slate-600 text-sm">
                      {review.reviewer.firstName} {review.reviewer.lastName}
                    </td>
                  )}
                  <td className="px-4 py-3 text-slate-600">{review._count.goals}</td>
                  <td className="px-4 py-3">
                    {review.rating ? (
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        <span className="text-sm font-medium text-slate-700">{Number(review.rating).toFixed(1)}</span>
                      </div>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", STATUS_STYLES[review.status])}>
                      {review.status.replace("_", " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-sm">{formatDate(review.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/${orgSlug}/performance/${review.id}`}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-600">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
          <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7 border-slate-200" disabled={page <= 1}
              onClick={() => { const p = new URLSearchParams(sp.toString()); p.set("page", String(page-1)); startTransition(() => router.push(`${pathname}?${p}`)); }}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7 border-slate-200" disabled={page >= totalPages}
              onClick={() => { const p = new URLSearchParams(sp.toString()); p.set("page", String(page+1)); startTransition(() => router.push(`${pathname}?${p}`)); }}>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
