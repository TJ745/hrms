"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, MoreHorizontal, Eye, Edit, UserX, ChevronLeft, ChevronRight } from "lucide-react";
import { getInitials, formatDate } from "@/lib/utils";
import type { EmploymentStatus } from "@prisma/client";

const STATUS_STYLES: Record<EmploymentStatus, string> = {
  ACTIVE:     "bg-green-50 text-green-700 border-green-200",
  INACTIVE:   "bg-slate-50 text-slate-600 border-slate-200",
  ON_LEAVE:   "bg-yellow-50 text-yellow-700 border-yellow-200",
  PROBATION:  "bg-blue-50 text-blue-700 border-blue-200",
  SUSPENDED:  "bg-orange-50 text-orange-700 border-orange-200",
  TERMINATED: "bg-red-50 text-red-700 border-red-200",
  RESIGNED:   "bg-purple-50 text-purple-700 border-purple-200",
};

type Employee = {
  id:             string;
  employeeCode:   string;
  firstName:      string;
  lastName:       string;
  avatar:         string | null;
  status:         EmploymentStatus;
  employmentType: string;
  hireDate:       Date;
  phone:          string | null;
  user:           { email: string };
  branch:         { id: string; name: string };
  department:     { id: string; name: string } | null;
  position:       { id: string; title: string } | null;
};

type Props = {
  employees:   Employee[];
  departments: { id: string; name: string }[];
  total:       number;
  page:        number;
  totalPages:  number;
  orgSlug:     string;
};

export function EmployeeTable({ employees, departments, total, page, totalPages, orgSlug }: Props) {
  const router     = useRouter();
  const pathname   = usePathname();
  const sp         = useSearchParams();
  const [, startTransition] = useTransition();

  const updateParam = useCallback((key: string, value: string | null) => {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }, [sp, pathname, router]);

  function setPage(p: number) {
    const params = new URLSearchParams(sp.toString());
    params.set("page", String(p));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      {/* Filters */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-100 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            placeholder="Search name, code, email..."
            defaultValue={sp.get("search") ?? ""}
            onChange={(e) => updateParam("search", e.target.value || null)}
            className="h-9 pl-9 border-slate-200 text-sm"
          />
        </div>

        <Select
          value={sp.get("status") ?? "ALL"}
          onValueChange={(v) => updateParam("status", v === "ALL" ? null : v)}
        >
          <SelectTrigger className="h-9 w-36 border-slate-200 text-sm">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="ON_LEAVE">On Leave</SelectItem>
            <SelectItem value="PROBATION">Probation</SelectItem>
            <SelectItem value="TERMINATED">Terminated</SelectItem>
            <SelectItem value="RESIGNED">Resigned</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={sp.get("dept") ?? "ALL"}
          onValueChange={(v) => updateParam("dept", v === "ALL" ? null : v)}
        >
          <SelectTrigger className="h-9 w-44 border-slate-200 text-sm">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(sp.get("search") || sp.get("status") || sp.get("dept")) && (
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-500 hover:text-slate-700 text-sm h-9"
            onClick={() => {
              const params = new URLSearchParams();
              startTransition(() => router.push(pathname));
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Department</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Branch</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Hire Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {employees.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-slate-400 text-sm">
                  No employees found
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={emp.avatar ?? undefined} />
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-semibold">
                          {getInitials(`${emp.firstName} ${emp.lastName}`)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Link
                          href={`/${orgSlug}/employees/${emp.id}`}
                          className="font-medium text-slate-800 hover:text-blue-600 transition-colors"
                        >
                          {emp.firstName} {emp.lastName}
                        </Link>
                        <p className="text-xs text-slate-400">{emp.employeeCode} · {emp.user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {emp.department?.name ?? <span className="text-slate-300">—</span>}
                    {emp.position && (
                      <p className="text-xs text-slate-400">{emp.position.title}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-sm">{emp.branch.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-500 capitalize">
                      {emp.employmentType.replace("_", " ").toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-sm">{formatDate(emp.hireDate)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[emp.status]}`}>
                      {emp.status.charAt(0) + emp.status.slice(1).toLowerCase().replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-600">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem asChild>
                          <Link href={`/${orgSlug}/employees/${emp.id}`}>
                            <Eye className="w-3.5 h-3.5 mr-2" /> View Profile
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/${orgSlug}/employees/${emp.id}/edit`}>
                            <Edit className="w-3.5 h-3.5 mr-2" /> Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600 focus:text-red-700 focus:bg-red-50">
                          <UserX className="w-3.5 h-3.5 mr-2" /> Terminate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 border-slate-200"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs text-slate-600 px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 border-slate-200"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
