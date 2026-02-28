"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { toggleAnnouncementPin, deleteAnnouncement } from "@/actions/announcement.actions";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronLeft, ChevronRight, Pin, PinOff, Trash2, MoreHorizontal, Megaphone, Globe, Building, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const AUDIENCE_ICONS = {
  ALL:        Globe,
  BRANCH:     Building,
  DEPARTMENT: Users,
};

const AUDIENCE_LABELS = {
  ALL:        "Company-wide",
  BRANCH:     "Branch",
  DEPARTMENT: "Department",
};

type Announcement = {
  id:          string;
  title:       string;
  content:     string;
  audience:    "ALL" | "BRANCH" | "DEPARTMENT";
  isPinned:    boolean;
  publishedAt: Date | null;
  expiresAt:   Date | null;
  createdBy:   string;
};

type Props = {
  announcements:  Announcement[];
  total:          number;
  page:           number;
  totalPages:     number;
  orgSlug:        string;
  organizationId: string;
  isHR:           boolean;
};

export function AnnouncementsGrid({ announcements, total, page, totalPages, orgSlug, organizationId, isHR }: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const sp       = useSearchParams();
  const [, startTransition] = useTransition();

  async function handlePin(id: string, isPinned: boolean) {
    await toggleAnnouncementPin(id, !isPinned, organizationId);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this announcement?")) return;
    await deleteAnnouncement(id, organizationId);
    router.refresh();
  }

  if (announcements.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 py-20 text-center">
        <Megaphone className="w-10 h-10 mx-auto mb-3 text-slate-200" />
        <p className="text-sm font-medium text-slate-500">No announcements yet</p>
        {isHR && <p className="text-xs text-slate-400 mt-1">Create your first announcement to get started</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">{total} announcement{total !== 1 ? "s" : ""}</p>

      <div className="space-y-3">
        {announcements.map((ann) => {
          const AudienceIcon = AUDIENCE_ICONS[ann.audience];
          const isExpired = ann.expiresAt && new Date(ann.expiresAt) < new Date();

          return (
            <div
              key={ann.id}
              className={cn(
                "bg-white rounded-xl border p-5 transition-all",
                ann.isPinned ? "border-blue-200 shadow-sm" : "border-slate-200",
                isExpired && "opacity-60"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                    ann.isPinned ? "bg-blue-100" : "bg-slate-100"
                  )}>
                    {ann.isPinned
                      ? <Pin className="w-4 h-4 text-blue-600" />
                      : <Megaphone className="w-4 h-4 text-slate-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-slate-900 text-sm">{ann.title}</h3>
                      {ann.isPinned && (
                        <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">
                          Pinned
                        </span>
                      )}
                      {isExpired && (
                        <span className="text-[10px] font-semibold text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
                          Expired
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">{ann.content}</p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <AudienceIcon className="w-3 h-3" />
                        {AUDIENCE_LABELS[ann.audience]}
                      </span>
                      {ann.publishedAt && (
                        <span>{new Date(ann.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      )}
                      {ann.expiresAt && !isExpired && (
                        <span>Expires {new Date(ann.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      )}
                    </div>
                  </div>
                </div>

                {isHR && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-600 shrink-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => handlePin(ann.id, ann.isPinned)} className="text-slate-600">
                        {ann.isPinned
                          ? <><PinOff className="w-3.5 h-3.5 mr-2" /> Unpin</>
                          : <><Pin    className="w-3.5 h-3.5 mr-2" /> Pin</>}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(ann.id)} className="text-red-600 focus:text-red-700 focus:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
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
