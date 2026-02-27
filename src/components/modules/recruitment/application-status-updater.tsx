"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateApplicationStatus } from "@/actions/recruitment.actions";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronDown, Loader2, UserCheck, UserX } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@prisma/client";

const STATUS_STYLES: Record<string, string> = {
  APPLIED:   "bg-blue-50 text-blue-700 border-blue-200",
  SCREENING: "bg-yellow-50 text-yellow-700 border-yellow-200",
  INTERVIEW: "bg-indigo-50 text-indigo-700 border-indigo-200",
  OFFER:     "bg-green-50 text-green-700 border-green-200",
  HIRED:     "bg-green-100 text-green-800 border-green-300",
  REJECTED:  "bg-red-50 text-red-600 border-red-200",
  WITHDRAWN: "bg-slate-50 text-slate-500 border-slate-200",
};

const PIPELINE: { status: ApplicationStatus; label: string }[] = [
  { status: "SCREENING", label: "Move to Screening"  },
  { status: "INTERVIEW", label: "Schedule Interview" },
  { status: "OFFER",     label: "Make Offer"         },
  { status: "HIRED",     label: "Mark as Hired"      },
];

type Props = {
  applicationId:  string;
  currentStatus:  ApplicationStatus;
  organizationId: string;
  orgSlug:        string;
};

export function ApplicationStatusUpdater({ applicationId, currentStatus, organizationId }: Props) {
  const router = useRouter();
  const [loading,      setLoading]      = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [notes,        setNotes]        = useState("");

  async function moveTo(status: ApplicationStatus, n?: string) {
    setLoading(true);
    await updateApplicationStatus({ applicationId, status, organizationId, notes: n });
    setLoading(false);
    router.refresh();
  }

  async function handleReject() {
    await moveTo("REJECTED", notes);
    setRejectDialog(false);
    setNotes("");
  }

  const isTerminal = currentStatus === "HIRED" || currentStatus === "REJECTED" || currentStatus === "WITHDRAWN";

  return (
    <>
      <div className="flex items-center gap-2">
        <span className={cn("inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border", STATUS_STYLES[currentStatus])}>
          {currentStatus.charAt(0) + currentStatus.slice(1).toLowerCase()}
        </span>

        {!isTerminal && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <>Move To <ChevronDown className="w-3.5 h-3.5 ml-1" /></>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {PIPELINE.filter(p => p.status !== currentStatus).map((stage) => (
                <DropdownMenuItem key={stage.status} onClick={() => moveTo(stage.status)}>
                  <UserCheck className="w-3.5 h-3.5 mr-2 text-slate-400" />
                  {stage.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setRejectDialog(true)} className="text-red-600 focus:text-red-700 focus:bg-red-50">
                <UserX className="w-3.5 h-3.5 mr-2" /> Reject
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Reject Application</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-500">Add an optional internal note about this rejection.</p>
          <div className="space-y-1.5">
            <Label className="text-slate-700 text-sm">Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="border-slate-200" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(false)} className="border-slate-200">Cancel</Button>
            <Button onClick={handleReject} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
