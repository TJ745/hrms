"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { updateLeaveStatus } from "@/actions/leave.actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Check, X, Loader2 } from "lucide-react";
import { getInitials, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  PENDING:  "bg-yellow-50 text-yellow-700 border-yellow-200",
  APPROVED: "bg-green-50 text-green-700 border-green-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  CANCELLED:"bg-slate-50 text-slate-500 border-slate-200",
};

type Request = {
  id:        string;
  startDate: Date;
  endDate:   Date;
  totalDays: any;
  status:    string;
  reason:    string | null;
  isHalfDay: boolean;
  createdAt: Date;
  employee:  { id: string; firstName: string; lastName: string; avatar: string | null; employeeCode: string; department: { name: string } | null };
  leaveType: { id: string; name: string; color: string | null };
};

type Props = {
  requests:       Request[];
  total:          number;
  page:           number;
  totalPages:     number;
  orgSlug:        string;
  isHR:           boolean;
  organizationId: string;
};

export function LeaveRequestsTable({ requests, total, page, totalPages, orgSlug, isHR, organizationId }: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const sp       = useSearchParams();
  const [, startTransition] = useTransition();

  const [rejectDialog, setRejectDialog] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [acting, setActing] = useState<string | null>(null);

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  async function handleApprove(id: string) {
    setActing(id);
    await updateLeaveStatus({ leaveRequestId: id, status: "APPROVED", organizationId });
    setActing(null);
    router.refresh();
  }

  async function handleReject() {
    if (!rejectDialog) return;
    setActing(rejectDialog.id);
    await updateLeaveStatus({
      leaveRequestId: rejectDialog.id,
      status:         "REJECTED",
      reason:         rejectReason,
      organizationId,
    });
    setActing(null);
    setRejectDialog(null);
    setRejectReason("");
    router.refresh();
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200">
        {/* Filters */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 flex-wrap gap-3">
          <h3 className="font-semibold text-slate-800 text-sm">
            Leave Requests
            <span className="ml-2 text-slate-400 font-normal text-xs">{total} total</span>
          </h3>
          <Select
            value={sp.get("status") ?? "ALL"}
            onValueChange={(v) => updateParam("status", v === "ALL" ? null : v)}
          >
            <SelectTrigger className="h-8 w-36 border-slate-200 text-sm">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {isHR && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</th>}
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Leave Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Dates</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Days</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Applied</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                {isHR && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-400 text-sm">No leave requests found</td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                    {isHR && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarImage src={req.employee.avatar ?? undefined} />
                            <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                              {getInitials(`${req.employee.firstName} ${req.employee.lastName}`)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-slate-800">{req.employee.firstName} {req.employee.lastName}</p>
                            <p className="text-xs text-slate-400">{req.employee.department?.name}</p>
                          </div>
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: req.leaveType.color ?? "#94a3b8" }} />
                        <span className="text-slate-700">{req.leaveType.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-sm">
                      {formatDate(req.startDate)}
                      {req.startDate.toString() !== req.endDate.toString() && (
                        <> – {formatDate(req.endDate)}</>
                      )}
                      {req.isHalfDay && <span className="ml-1 text-xs text-slate-400">(Half day)</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{Number(req.totalDays)}</td>
                    <td className="px-4 py-3 text-slate-500 text-sm">{formatDate(req.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", STATUS_STYLES[req.status])}>
                        {req.status.charAt(0) + req.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    {isHR && (
                      <td className="px-4 py-3">
                        {req.status === "PENDING" && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                              disabled={acting === req.id}
                              onClick={() => handleApprove(req.id)}
                            >
                              {acting === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                              disabled={acting === req.id}
                              onClick={() => setRejectDialog({ id: req.id, name: `${req.employee.firstName} ${req.employee.lastName}` })}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7 border-slate-200" disabled={page <= 1}
                onClick={() => { const p = new URLSearchParams(sp.toString()); p.set("page", String(page-1)); startTransition(() => router.push(`${pathname}?${p.toString()}`)); }}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7 border-slate-200" disabled={page >= totalPages}
                onClick={() => { const p = new URLSearchParams(sp.toString()); p.set("page", String(page+1)); startTransition(() => router.push(`${pathname}?${p.toString()}`)); }}>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Reject dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => { setRejectDialog(null); setRejectReason(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">
            Rejecting leave request for <strong>{rejectDialog?.name}</strong>. Provide a reason (optional).
          </p>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection..."
            rows={3}
            className="border-slate-200"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)} className="border-slate-200">Cancel</Button>
            <Button
              onClick={handleReject}
              disabled={!!acting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
