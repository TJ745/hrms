"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition, useState } from "react";
import { updateJobPostingStatus } from "@/actions/recruitment.actions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronLeft, ChevronRight, MoreHorizontal, Eye, Users, PauseCircle, XCircle, CheckCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { JobStatus } from "@prisma/client";

const STATUS_STYLES: Record<string, string> = {
  DRAFT:   "bg-slate-50 text-slate-600 border-slate-200",
  OPEN:    "bg-green-50 text-green-700 border-green-200",
  ON_HOLD: "bg-yellow-50 text-yellow-700 border-yellow-200",
  CLOSED:  "bg-red-50 text-red-600 border-red-200",
};

type Posting = {
  id:             string;
  title:          string;
  employmentType: string;
  status:         JobStatus;
  location:       string | null;
  openings:       number;
  deadline:       Date | null;
  createdAt:      Date;
  position:       { title: string } | null;
  _count:         { applications: number };
};

type Props = {
  postings:       Posting[];
  total:          number;
  page:           number;
  totalPages:     number;
  orgSlug:        string;
  organizationId: string;
};

export function JobPostingsTable({ postings, total, page, totalPages, orgSlug, organizationId }: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const sp       = useSearchParams();
  const [, startTransition] = useTransition();
  const [acting, setActing] = useState<string | null>(null);

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  async function changeStatus(id: string, status: JobStatus) {
    setActing(id);
    await updateJobPostingStatus(id, status, organizationId);
    setActing(null);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 flex-wrap gap-3">
        <h3 className="font-semibold text-slate-800 text-sm">
          Job Postings <span className="ml-2 text-slate-400 font-normal text-xs">{total} total</span>
        </h3>
        <Select value={sp.get("status") ?? "ALL"} onValueChange={(v) => updateParam("status", v === "ALL" ? null : v)}>
          <SelectTrigger className="h-8 w-32 border-slate-200 text-sm"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="ON_HOLD">On Hold</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Job Title</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Openings</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Applicants</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Deadline</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {postings.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-16 text-slate-400 text-sm">No job postings found</td></tr>
            ) : (
              postings.map((post) => (
                <tr key={post.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/${orgSlug}/recruitment/jobs/${post.id}`} className="font-medium text-slate-800 hover:text-blue-600 transition-colors">
                      {post.title}
                    </Link>
                    {post.position && <p className="text-xs text-slate-400 mt-0.5">{post.position.title}</p>}
                    {post.location && <p className="text-xs text-slate-400">{post.location}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-sm capitalize">
                    {post.employmentType.replace("_", " ").toLowerCase()}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{post.openings}</td>
                  <td className="px-4 py-3">
                    <Link href={`/${orgSlug}/recruitment/applicants?job=${post.id}`} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium">
                      <Users className="w-3.5 h-3.5" />{post._count.applications}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-sm">
                    {post.deadline
                      ? <span className={new Date(post.deadline) < new Date() ? "text-red-500" : ""}>{formatDate(post.deadline)}</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", STATUS_STYLES[post.status])}>
                      {post.status === "ON_HOLD" ? "On Hold" : post.status.charAt(0) + post.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-600">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem asChild>
                          <Link href={`/${orgSlug}/recruitment/jobs/${post.id}`}>
                            <Eye className="w-3.5 h-3.5 mr-2" /> View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/${orgSlug}/recruitment/applicants?job=${post.id}`}>
                            <Users className="w-3.5 h-3.5 mr-2" /> View Applicants
                          </Link>
                        </DropdownMenuItem>
                        {post.status === "DRAFT" && (
                          <DropdownMenuItem onClick={() => changeStatus(post.id, "OPEN")} className="text-green-600">
                            <CheckCircle className="w-3.5 h-3.5 mr-2" /> Publish
                          </DropdownMenuItem>
                        )}
                        {post.status === "OPEN" && (
                          <DropdownMenuItem onClick={() => changeStatus(post.id, "ON_HOLD")} className="text-yellow-600">
                            <PauseCircle className="w-3.5 h-3.5 mr-2" /> Put On Hold
                          </DropdownMenuItem>
                        )}
                        {post.status === "ON_HOLD" && (
                          <DropdownMenuItem onClick={() => changeStatus(post.id, "OPEN")} className="text-green-600">
                            <CheckCircle className="w-3.5 h-3.5 mr-2" /> Reopen
                          </DropdownMenuItem>
                        )}
                        {post.status !== "CLOSED" && (
                          <DropdownMenuItem onClick={() => changeStatus(post.id, "CLOSED")} className="text-red-600 focus:text-red-700 focus:bg-red-50">
                            <XCircle className="w-3.5 h-3.5 mr-2" /> Close
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
