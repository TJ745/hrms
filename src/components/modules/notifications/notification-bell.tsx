"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "@/actions/notification.actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Megaphone,
  ClipboardList,
  DollarSign,
  Clock,
  Star,
  Briefcase,
  FileText,
  Ticket,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NotificationType } from "@prisma/client";

const TYPE_ICONS: Record<NotificationType, React.ElementType> = {
  LEAVE_REQUEST:      ClipboardList,
  LEAVE_APPROVED:     Check,
  LEAVE_REJECTED:     AlertCircle,
  PAYSLIP_READY:      DollarSign,
  ATTENDANCE_ALERT:   Clock,
  ANNOUNCEMENT:       Megaphone,
  PERFORMANCE_REVIEW: Star,
  JOB_APPLICATION:    Briefcase,
  CONTRACT_EXPIRY:    FileText,
  VISA_EXPIRY:        FileText,
  TICKET_UPDATE:      Ticket,
  GENERAL:            Bell,
};

const TYPE_COLORS: Record<NotificationType, string> = {
  LEAVE_REQUEST:      "bg-blue-100 text-blue-600",
  LEAVE_APPROVED:     "bg-green-100 text-green-600",
  LEAVE_REJECTED:     "bg-red-100 text-red-600",
  PAYSLIP_READY:      "bg-emerald-100 text-emerald-600",
  ATTENDANCE_ALERT:   "bg-orange-100 text-orange-600",
  ANNOUNCEMENT:       "bg-purple-100 text-purple-600",
  PERFORMANCE_REVIEW: "bg-yellow-100 text-yellow-600",
  JOB_APPLICATION:    "bg-indigo-100 text-indigo-600",
  CONTRACT_EXPIRY:    "bg-rose-100 text-rose-600",
  VISA_EXPIRY:        "bg-rose-100 text-rose-600",
  TICKET_UPDATE:      "bg-slate-100 text-slate-600",
  GENERAL:            "bg-slate-100 text-slate-600",
};

type Notification = {
  id:        string;
  type:      NotificationType;
  title:     string;
  body:      string;
  link:      string | null;
  isRead:    boolean;
  createdAt: Date;
};

type Props = {
  notifications:  Notification[];
  unreadCount:    number;
  userId:         string;
  orgSlug:        string;
};

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60)   return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function NotificationBell({ notifications, unreadCount, userId, orgSlug }: Props) {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [items, setItems]     = useState(notifications);
  const [count, setCount]     = useState(unreadCount);
  const [, startTransition]   = useTransition();

  async function handleRead(id: string) {
    await markNotificationRead(id);
    setItems(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setCount(prev => Math.max(0, prev - 1));
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await deleteNotification(id);
    const wasUnread = items.find(n => n.id === id)?.isRead === false;
    setItems(prev => prev.filter(n => n.id !== id));
    if (wasUnread) setCount(prev => Math.max(0, prev - 1));
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead(userId);
    setItems(prev => prev.map(n => ({ ...n, isRead: true })));
    setCount(0);
  }

  function handleNotificationClick(notification: Notification) {
    if (!notification.isRead) handleRead(notification.id);
    if (notification.link) {
      setOpen(false);
      startTransition(() => router.push(`/${orgSlug}${notification.link}`));
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700">
          <Bell className="w-5 h-5" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-96 p-0 shadow-xl border-slate-200 rounded-xl overflow-hidden"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 text-sm">Notifications</h3>
            {count > 0 && (
              <span className="text-xs font-semibold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                {count} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {count > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-slate-500 hover:text-slate-700 px-2"
                onClick={handleMarkAllRead}
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1" /> Mark all read
              </Button>
            )}
            <Link href={`/${orgSlug}/notifications`} onClick={() => setOpen(false)}>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-500 hover:text-slate-700 px-2">
                Settings
              </Button>
            </Link>
          </div>
        </div>

        {/* List */}
        <div className="max-h-[420px] overflow-y-auto bg-white divide-y divide-slate-50">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <BellOff className="w-8 h-8 text-slate-200 mb-2" />
              <p className="text-sm font-medium text-slate-400">All caught up</p>
              <p className="text-xs text-slate-300 mt-0.5">No notifications yet</p>
            </div>
          ) : (
            items.map((notif) => {
              const Icon = TYPE_ICONS[notif.type] ?? Bell;
              const colorClass = TYPE_COLORS[notif.type] ?? "bg-slate-100 text-slate-600";
              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 cursor-pointer group transition-colors",
                    notif.isRead ? "hover:bg-slate-50" : "bg-blue-50/40 hover:bg-blue-50"
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5", colorClass)}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm leading-tight", notif.isRead ? "text-slate-600" : "text-slate-900 font-medium")}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed line-clamp-2">{notif.body}</p>
                    <p className="text-[10px] text-slate-300 mt-1">{timeAgo(notif.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notif.isRead && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRead(notif.id); }}
                        className="p-1 rounded hover:bg-blue-100 text-blue-500 transition-colors"
                        title="Mark as read"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(notif.id, e)}
                      className="p-1 rounded hover:bg-red-100 text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  {!notif.isRead && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-center">
            <Link
              href={`/${orgSlug}/notifications`}
              onClick={() => setOpen(false)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              View all notifications
            </Link>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
