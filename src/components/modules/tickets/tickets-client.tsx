"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createTicket,
  updateTicketStatus,
  addTicketComment,
} from "@/actions/workforce.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Plus,
  TicketIcon,
  MessageCircle,
  ChevronLeft,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = ["IT", "HR", "PAYROLL", "LEAVE", "GENERAL", "FACILITIES", "OTHER"];
const PRIORITIES  = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const STATUSES    = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

const PRIORITY_STYLES: Record<string, string> = {
  LOW:    "bg-slate-100 text-slate-500",
  MEDIUM: "bg-blue-100 text-blue-600",
  HIGH:   "bg-orange-100 text-orange-600",
  URGENT: "bg-red-100 text-red-600",
};

const STATUS_STYLES: Record<string, string> = {
  OPEN:        "bg-yellow-100 text-yellow-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  RESOLVED:    "bg-green-100 text-green-700",
  CLOSED:      "bg-slate-100 text-slate-500",
};

const STATUS_ICONS: Record<string, any> = {
  OPEN:        Clock,
  IN_PROGRESS: AlertTriangle,
  RESOLVED:    CheckCircle2,
  CLOSED:      XCircle,
};

type Ticket = {
  id:          string;
  title:       string;
  description: string;
  category:    string;
  priority:    string;
  status:      string;
  createdAt:   string;
  employee:    { firstName: string; lastName: string; employeeCode: string; avatar: string | null };
  assignedTo:  { firstName: string; lastName: string } | null;
  comments:    { id: string; userId: string; content: string; createdAt: string }[];
  _count:      { comments: number };
};

type Props = {
  tickets:           Ticket[];
  agents:            { id: string; name: string }[];
  isHR:              boolean;
  currentUserId:     string;
  currentEmployeeId: string | null;
  organizationId:    string;
  orgSlug:           string;
};

export function TicketsClient({
  tickets,
  agents,
  isHR,
  currentUserId,
  currentEmployeeId,
  organizationId,
  orgSlug,
}: Props) {
  const router = useRouter();
  const [loading,        setLoading]        = useState(false);
  const [showForm,       setShowForm]       = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [filterStatus,   setFilterStatus]   = useState("ALL");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [comment,        setComment]        = useState("");

  const [form, setForm] = useState({
    title: "", description: "", category: "GENERAL", priority: "MEDIUM",
  });

  // Filtered tickets
  const filtered = tickets.filter((t) => {
    const matchStatus   = filterStatus   === "ALL" || t.status   === filterStatus;
    const matchCategory = filterCategory === "ALL" || t.category === filterCategory;
    return matchStatus && matchCategory;
  });

  // Stats
  const stats = {
    open:       tickets.filter((t) => t.status === "OPEN").length,
    inProgress: tickets.filter((t) => t.status === "IN_PROGRESS").length,
    resolved:   tickets.filter((t) => t.status === "RESOLVED").length,
    urgent:     tickets.filter((t) => t.priority === "URGENT" && t.status === "OPEN").length,
  };

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!currentEmployeeId) return;
    setLoading(true);
    const result = await createTicket({
      organizationId,
      employeeId:  currentEmployeeId,
      category:    form.category as any,
      title:       form.title,
      description: form.description,
      priority:    form.priority as any,
    });
    setLoading(false);
    if (result.success) {
      setShowForm(false);
      setForm({ title: "", description: "", category: "GENERAL", priority: "MEDIUM" });
      router.refresh();
    }
  }

  async function handleStatusChange(ticketId: string, status: string, assignedToId?: string) {
    setLoading(true);
    await updateTicketStatus({ ticketId, status: status as any, assignedToId, organizationId });
    setLoading(false);
    // Update local selected ticket status
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket((p) => p ? { ...p, status } : null);
    }
    router.refresh();
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim() || !selectedTicket) return;
    setLoading(true);
    await addTicketComment({
      ticketId: selectedTicket.id,
      userId:   currentUserId,
      content:  comment.trim(),
    });
    setLoading(false);
    setComment("");
    router.refresh();
  }

  // ── Detail view ──────────────────────────────────────────────
  if (selectedTicket) {
    const StatusIcon = STATUS_ICONS[selectedTicket.status] ?? Clock;
    return (
      <div className="space-y-5">
        {/* Back button */}
        <button
          onClick={() => setSelectedTicket(null)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Tickets
        </button>

        {/* Ticket header */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase", PRIORITY_STYLES[selectedTicket.priority])}>
                  {selectedTicket.priority}
                </span>
                <span className="text-xs text-slate-400">{selectedTicket.category}</span>
                <span className="text-xs text-slate-300">·</span>
                <span className="text-xs text-slate-400">
                  {new Date(selectedTicket.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">{selectedTicket.title}</h2>
              <p className="text-sm text-slate-500 mt-1">{selectedTicket.description}</p>
              <p className="text-xs text-slate-400 mt-2">
                Submitted by: <span className="font-medium text-slate-600">{selectedTicket.employee.firstName} {selectedTicket.employee.lastName}</span>
                {selectedTicket.assignedTo && (
                  <> · Assigned to: <span className="font-medium text-slate-600">{selectedTicket.assignedTo.firstName} {selectedTicket.assignedTo.lastName}</span></>
                )}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5", STATUS_STYLES[selectedTicket.status])}>
                <StatusIcon className="w-3 h-3" />
                {selectedTicket.status.replace("_", " ")}
              </span>
            </div>
          </div>

          {/* HR actions */}
          {isHR && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
              {selectedTicket.status === "OPEN" && (
                <Button
                  size="sm"
                  onClick={() => handleStatusChange(selectedTicket.id, "IN_PROGRESS")}
                  disabled={loading}
                  className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Start Working"}
                </Button>
              )}
              {["OPEN", "IN_PROGRESS"].includes(selectedTicket.status) && (
                <Button
                  size="sm"
                  onClick={() => handleStatusChange(selectedTicket.id, "RESOLVED")}
                  disabled={loading}
                  className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
                >
                  Mark Resolved
                </Button>
              )}
              {selectedTicket.status === "RESOLVED" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange(selectedTicket.id, "CLOSED")}
                  disabled={loading}
                  className="h-8 text-xs border-slate-200"
                >
                  Close Ticket
                </Button>
              )}
              {agents.length > 0 && (
                <Select onValueChange={(v) => handleStatusChange(selectedTicket.id, selectedTicket.status, v)}>
                  <SelectTrigger className="h-8 text-xs border-slate-200 w-44">
                    <SelectValue placeholder="Assign to agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id} className="text-xs">{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>

        {/* Comments */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">
              Comments ({selectedTicket.comments.length})
            </span>
          </div>

          {selectedTicket.comments.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              No comments yet. Be the first to respond.
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {selectedTicket.comments.map((c) => {
                const isMe = c.userId === currentUserId;
                return (
                  <div key={c.id} className={cn("px-5 py-4", isMe && "bg-blue-50/30")}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                        isMe ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
                      )}>
                        {isMe ? "Me" : <User className="w-3 h-3" />}
                      </div>
                      <span className="text-xs font-semibold text-slate-700">
                        {isMe ? "You" : "HR"}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 ml-8">{c.content}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Comment input */}
          {selectedTicket.status !== "CLOSED" && (
            <form onSubmit={handleComment} className="p-4 border-t border-slate-100 flex gap-2">
              <Input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write a comment..."
                className="border-slate-200 flex-1"
              />
              <Button
                type="submit"
                disabled={loading || !comment.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ── List view ────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Support Tickets</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isHR ? "Manage and respond to employee support requests" : "Submit and track your support requests"}
          </p>
        </div>
        {currentEmployeeId && (
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-1.5" /> New Ticket
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Open",        value: stats.open,       color: "text-yellow-600", bg: "bg-yellow-50",  icon: Clock },
          { label: "In Progress", value: stats.inProgress, color: "text-blue-600",   bg: "bg-blue-50",    icon: AlertTriangle },
          { label: "Resolved",    value: stats.resolved,   color: "text-green-600",  bg: "bg-green-50",   icon: CheckCircle2 },
          { label: "Urgent",      value: stats.urgent,     color: "text-red-600",    bg: "bg-red-50",     icon: AlertTriangle },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", s.bg)}>
              <s.icon className={cn("w-5 h-5", s.color)} />
            </div>
            <div>
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className={cn("text-2xl font-bold tabular-nums", s.color)}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* New ticket form */}
      {showForm && currentEmployeeId && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Submit New Ticket</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Title *
                </Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  required
                  placeholder="Brief summary of your issue"
                  className="border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Category *
                </Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}
                >
                  <SelectTrigger className="border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Priority
                </Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}
                >
                  <SelectTrigger className="border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Description *
                </Label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  required
                  rows={4}
                  placeholder="Describe your issue in detail..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-slate-200"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Ticket"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
          {["ALL", ...STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                filterStatus === s
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="h-9 text-xs border-slate-200 w-36 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Ticket list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <TicketIcon className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No tickets found</p>
            {!isHR && (
              <p className="text-slate-300 text-xs mt-1">
                Click "New Ticket" to submit a support request
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((ticket) => {
              const StatusIcon = STATUS_ICONS[ticket.status] ?? Clock;
              return (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      ticket.priority === "URGENT" ? "bg-red-50" : "bg-slate-100"
                    )}>
                      <TicketIcon className={cn(
                        "w-5 h-5",
                        ticket.priority === "URGENT" ? "text-red-500" : "text-slate-400"
                      )} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {ticket.title}
                        </p>
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0",
                          PRIORITY_STYLES[ticket.priority]
                        )}>
                          {ticket.priority}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {isHR && `${ticket.employee.firstName} ${ticket.employee.lastName} · `}
                        {ticket.category} ·{" "}
                        {new Date(ticket.createdAt).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                        {ticket.assignedTo && (
                          <> · Assigned to {ticket.assignedTo.firstName}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    {ticket._count.comments > 0 && (
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <MessageCircle className="w-3.5 h-3.5" />
                        {ticket._count.comments}
                      </span>
                    )}
                    <span className={cn(
                      "text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5",
                      STATUS_STYLES[ticket.status]
                    )}>
                      <StatusIcon className="w-3 h-3" />
                      {ticket.status.replace("_", " ")}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
