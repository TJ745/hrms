"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition, useState } from "react";
import { updateApplicationStatus } from "@/actions/recruitment.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronLeft, ChevronRight, Search, MoreHorizontal, Eye, UserCheck, UserX, Phone, Video, Building } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@prisma/client";

const STATUS_STYLES: Record<string, string> = {
  NEW:        "bg-blue-50 text-blue-700 border-blue-200",
  REVIEWING:  "bg-yellow-50 text-yellow-700 border-yellow-200",
  SHORTLISTED:"bg-purple-50 text-purple-700 border-purple-200",
  INTERVIEW:  "bg-indigo-50 text-indigo-700 border-indigo-200",
  OFFERED:    "bg-green-50 text-green-700 border-green-200",
  HIRED:      "bg-green-100 text-green-800 border-green-300",
  REJECTED:   "bg-red-50 text-red-600 border-red-200",
  WITHDRAWN:  "bg-slate-50 text-slate-500 border-slate-200",
};

const PIPELINE: { status: ApplicationStatus; label: string }[] = [
  { status: "NEW",         label: "New"         },
  { status: "REVIEWING",  label: "Reviewing"   },
  { status: "SHORTLISTED",label: "Shortlisted" },
  { status: "INTERVIEW",  label: "Interview"   },
  { status: "OFFERED",    label: "Offered"     },
  { status: "HIRED",      label: "Hired"       },
];

type Application = {
  id:        string;
  firstName: string;
  lastName:  string;
  email:     string;
  phone:     string | null;
  status:    ApplicationStatus;
  source:    string | null;
  createdAt: Date;
  expectedSalary: any;
  yearsExperience: number | null;
  jobPosting: { id: string; title: string; department: { name: string } | null };
  interviews: { scheduledAt: Date; type: string }[];
};

type Props = {
  applications:   Application[];
  jobs:           { id: string; title: string }[];
  total:          number;
  page:           number;
  totalPages:     number;
  orgSlug:        string;
  organizationId: string;
};

export function ApplicantsTable({ applications, jobs, total, page, totalPages, orgSlug, organizationId }: Props) {
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

  async function moveStatus(id: string, status: ApplicationStatus) {
    setActing(id);
    await updateApplicationStatus({ applicationId: id, status, organizationId });
    setActing(null);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      {/* Filters */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            placeholder="Search name or email..."
            defaultValue={sp.get("search") ?? ""}
            onChange={(e) => updateParam("search", e.target.value || null)}
            className="h-9 pl-9 border-slate-200 text-sm"
          />
        </div>
        <Select value={sp.get("job") ?? "ALL"} onValueChange={(v) => updateParam("job", v === "ALL" ? null : v)}>
          <SelectTrigger className="h-9 w-48 border-slate-200 text-sm"><SelectValue placeholder="All Jobs" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Jobs</SelectItem>
            {jobs.map((j) => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sp.get("status") ?? "ALL"} onValueChange={(v) => updateParam("status", v === "ALL" ? null : v)}>
          <SelectTrigger className="h-9 w-36 border-slate-200 text-sm"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            {PIPELINE.map((s) => <SelectItem key={s.status} value={s.status}>{s.label}</SelectItem>)}
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Pipeline header */}
      <div className="flex gap-1 px-4 py-3 border-b border-slate-100 overflow-x-auto">
        {PIPELINE.map((stage) => {
          const count = applications.filter(a => a.status === stage.status).length;
          const active = sp.get("status") === stage.status;
          return (
            <button
              key={stage.status}
              onClick={() => updateParam("status", active ? null : stage.status)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap",
                active ? STATUS_STYLES[stage.status] : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300"
              )}
            >
              {stage.label}
              <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", active ? "bg-white/60" : "bg-slate-200 text-slate-600")}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Applicant</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Job</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Experience</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Applied</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Next Interview</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {applications.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-slate-400 text-sm">No applications found</td>
              </tr>
            ) : (
              applications.map((app) => {
                const nextInterview = app.interviews[0];
                return (
                  <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/${orgSlug}/recruitment/applicants/${app.id}`} className="font-medium text-slate-800 hover:text-blue-600 transition-colors">
                        {app.firstName} {app.lastName}
                      </Link>
                      <p className="text-xs text-slate-400">{app.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700">{app.jobPosting.title}</p>
                      <p className="text-xs text-slate-400">{app.jobPosting.department?.name}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-sm">
                      {app.yearsExperience != null ? `${app.yearsExperience} yr${app.yearsExperience !== 1 ? "s" : ""}` : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-sm">{formatDate(app.createdAt)}</td>
                    <td className="px-4 py-3 text-sm">
                      {nextInterview ? (
                        <div>
                          <p className="text-slate-700">{formatDate(nextInterview.scheduledAt)}</p>
                          <p className="text-xs text-slate-400 capitalize">{nextInterview.type.toLowerCase().replace("_", " ")}</p>
                        </div>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", STATUS_STYLES[app.status])}>
                        {app.status.charAt(0) + app.status.slice(1).toLowerCase()}
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
                            <Link href={`/${orgSlug}/recruitment/applicants/${app.id}`}>
                              <Eye className="w-3.5 h-3.5 mr-2" /> View Profile
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => moveStatus(app.id, "SHORTLISTED")} className="text-purple-600">
                            <UserCheck className="w-3.5 h-3.5 mr-2" /> Shortlist
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => moveStatus(app.id, "OFFERED")} className="text-green-600">
                            <UserCheck className="w-3.5 h-3.5 mr-2" /> Make Offer
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => moveStatus(app.id, "HIRED")} className="text-green-700">
                            <UserCheck className="w-3.5 h-3.5 mr-2" /> Mark Hired
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => moveStatus(app.id, "REJECTED")} className="text-red-600 focus:text-red-700 focus:bg-red-50">
                            <UserX className="w-3.5 h-3.5 mr-2" /> Reject
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
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
