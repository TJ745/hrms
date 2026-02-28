"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  upsertNotificationPreference,
} from "@/actions/notification.actions";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Bell, BellOff, CheckCheck, Trash2, Check,
  ClipboardList, AlertCircle, DollarSign, Clock,
  Megaphone, Star, Briefcase, FileText, Ticket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NotificationType } from "@prisma/client";

const TYPE_META: Record<NotificationType, { label: string; icon: React.ElementType; color: string }> = {
  LEAVE_REQUEST:      { label: "Leave Requests",       icon: ClipboardList, color: "bg-blue-100 text-blue-600"    },
  LEAVE_APPROVED:     { label: "Leave Approved",       icon: Check,         color: "bg-green-100 text-green-600"  },
  LEAVE_REJECTED:     { label: "Leave Rejected",       icon: AlertCircle,   color: "bg-red-100 text-red-600"      },
  PAYSLIP_READY:      { label: "Payslip Ready",        icon: DollarSign,    color: "bg-emerald-100 text-emerald-600" },
  ATTENDANCE_ALERT:   { label: "Attendance Alerts",    icon: Clock,         color: "bg-orange-100 text-orange-600" },
  ANNOUNCEMENT:       { label: "Announcements",        icon: Megaphone,     color: "bg-purple-100 text-purple-600" },
  PERFORMANCE_REVIEW: { label: "Performance Reviews",  icon: Star,          color: "bg-yellow-100 text-yellow-600" },
  JOB_APPLICATION:    { label: "Job Applications",     icon: Briefcase,     color: "bg-indigo-100 text-indigo-600" },
  CONTRACT_EXPIRY:    { label: "Contract Expiry",      icon: FileText,      color: "bg-rose-100 text-rose-600"    },
  VISA_EXPIRY:        { label: "Visa Expiry",          icon: FileText,      color: "bg-rose-100 text-rose-600"    },
  TICKET_UPDATE:      { label: "Ticket Updates",       icon: Ticket,        color: "bg-slate-100 text-slate-600"  },
  GENERAL:            { label: "General",              icon: Bell,          color: "bg-slate-100 text-slate-600"  },
};

type Notif = {
  id:        string;
  type:      NotificationType;
  title:     string;
  body:      string;
  link:      string | null;
  isRead:    boolean;
  createdAt: Date;
};

type Pref = {
  type:  NotificationType;
  inApp: boolean;
  email: boolean;
};

type Props = {
  notifications: Notif[];
  preferences:   Pref[];
  userId:        string;
  orgSlug:       string;
};

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function NotificationsPageClient({ notifications, preferences, userId, orgSlug }: Props) {
  const router = useRouter();
  const [tab,   setTab]   = useState<"history" | "preferences">("history");
  const [items, setItems] = useState(notifications);
  const [prefs, setPrefs] = useState<Record<string, Pref>>(() =>
    Object.fromEntries(preferences.map(p => [p.type, p]))
  );

  const unread = items.filter(n => !n.isRead).length;

  async function handleRead(id: string) {
    await markNotificationRead(id);
    setItems(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  }

  async function handleDelete(id: string) {
    await deleteNotification(id);
    setItems(prev => prev.filter(n => n.id !== id));
  }

  async function handleMarkAll() {
    await markAllNotificationsRead(userId);
    setItems(prev => prev.map(n => ({ ...n, isRead: true })));
  }

  async function togglePref(type: NotificationType, field: "inApp" | "email", value: boolean) {
    const current = prefs[type] ?? { type, inApp: true, email: true };
    const updated = { ...current, [field]: value };
    setPrefs(prev => ({ ...prev, [type]: updated }));
    await upsertNotificationPreference({ userId, type, inApp: updated.inApp, email: updated.email });
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {(["history", "preferences"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
              tab === t
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {t === "history" ? `Notifications ${unread > 0 ? `(${unread} unread)` : ""}` : "Preferences"}
          </button>
        ))}
      </div>

      {/* Notification history */}
      {tab === "history" && (
        <div>
          {unread > 0 && (
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-blue-50/30">
              <p className="text-xs text-slate-500">{unread} unread notification{unread !== 1 ? "s" : ""}</p>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600 hover:text-blue-700 px-2" onClick={handleMarkAll}>
                <CheckCheck className="w-3.5 h-3.5 mr-1" /> Mark all read
              </Button>
            </div>
          )}

          <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <BellOff className="w-10 h-10 text-slate-200 mb-3" />
                <p className="text-sm font-medium text-slate-400">No notifications</p>
              </div>
            ) : (
              items.map((notif) => {
                const meta = TYPE_META[notif.type];
                const Icon = meta?.icon ?? Bell;
                return (
                  <div
                    key={notif.id}
                    className={cn(
                      "flex items-start gap-3 px-5 py-4 group transition-colors",
                      notif.isRead ? "hover:bg-slate-50" : "bg-blue-50/30 hover:bg-blue-50/50"
                    )}
                  >
                    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0", meta?.color ?? "bg-slate-100 text-slate-600")}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm", notif.isRead ? "text-slate-600" : "text-slate-900 font-medium")}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{notif.body}</p>
                      <p className="text-[10px] text-slate-300 mt-1.5">{timeAgo(notif.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {!notif.isRead && (
                        <button onClick={() => handleRead(notif.id)}
                          className="p-1.5 rounded hover:bg-blue-100 text-blue-500 transition-colors" title="Mark read">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(notif.id)}
                        className="p-1.5 rounded hover:bg-red-100 text-red-400 transition-colors" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {!notif.isRead && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Preferences */}
      {tab === "preferences" && (
        <div className="divide-y divide-slate-50">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_80px_80px] items-center px-5 py-3 bg-slate-50">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Notification Type</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">In-App</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">Email</span>
          </div>

          {(Object.keys(TYPE_META) as NotificationType[]).map((type) => {
            const meta    = TYPE_META[type];
            const Icon    = meta.icon;
            const current = prefs[type] ?? { inApp: true, email: true };
            return (
              <div key={type} className="grid grid-cols-[1fr_80px_80px] items-center px-5 py-3.5 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", meta.color)}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <Label className="text-sm text-slate-700 cursor-pointer">{meta.label}</Label>
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={current.inApp}
                    onCheckedChange={(v) => togglePref(type, "inApp", v)}
                  />
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={current.email}
                    onCheckedChange={(v) => togglePref(type, "email", v)}
                  />
                </div>
              </div>
            );
          })}

          <div className="px-5 py-4 text-xs text-slate-400 bg-slate-50">
            Changes are saved automatically. Email notifications are sent to your registered email address.
          </div>
        </div>
      )}
    </div>
  );
}
