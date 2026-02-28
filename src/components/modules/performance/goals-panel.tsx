"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createGoal, updateGoal, deleteGoal } from "@/actions/performance.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Trash2, ChevronDown, CheckCircle2, Circle, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GoalStatus } from "@prisma/client";

const STATUS_ICONS = {
  NOT_STARTED: Circle,
  IN_PROGRESS: Clock,
  COMPLETED:   CheckCircle2,
  CANCELLED:   XCircle,
};

const STATUS_STYLES: Record<string, string> = {
  NOT_STARTED: "text-slate-400",
  IN_PROGRESS: "text-blue-500",
  COMPLETED:   "text-green-500",
  CANCELLED:   "text-red-400",
};

type Goal = {
  id:          string;
  title:       string;
  description: string | null;
  status:      GoalStatus;
  progress:    number;
  dueDate:     Date | null;
  kpiTarget:   any;
  kpiActual:   any;
  kpiUnit:     string | null;
};

type Props = {
  goals:          Goal[];
  reviewId:       string;
  employeeId:     string;
  organizationId: string;
  canEdit:        boolean;
};

export function GoalsPanel({ goals, reviewId, employeeId, organizationId, canEdit }: Props) {
  const router = useRouter();
  const [showAdd, setShowAdd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({
    title:       "",
    description: "",
    dueDate:     "",
    kpiTarget:   "",
    kpiUnit:     "",
  });
  const [progEdit, setProgEdit] = useState<{ id: string; progress: number; kpiActual: string } | null>(null);

  function setF(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleAddGoal(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await createGoal({
      employeeId,
      reviewId,
      organizationId,
      title:       form.title,
      description: form.description || undefined,
      dueDate:     form.dueDate     || undefined,
      kpiTarget:   form.kpiTarget ? parseFloat(form.kpiTarget) : undefined,
      kpiUnit:     form.kpiUnit    || undefined,
    });
    setLoading(false);
    setShowAdd(false);
    setForm({ title: "", description: "", dueDate: "", kpiTarget: "", kpiUnit: "" });
    router.refresh();
  }

  async function handleStatusChange(goalId: string, status: GoalStatus) {
    await updateGoal({ goalId, organizationId, status, progress: status === "COMPLETED" ? 100 : undefined });
    router.refresh();
  }

  async function handleProgressSave(goalId: string) {
    if (!progEdit) return;
    await updateGoal({
      goalId,
      organizationId,
      progress:  progEdit.progress,
      kpiActual: progEdit.kpiActual ? parseFloat(progEdit.kpiActual) : undefined,
    });
    setProgEdit(null);
    router.refresh();
  }

  async function handleDelete(goalId: string) {
    if (!confirm("Delete this goal?")) return;
    await deleteGoal(goalId, organizationId);
    router.refresh();
  }

  const completedCount = goals.filter(g => g.status === "COMPLETED").length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">Goals</h3>
          <p className="text-xs text-slate-400 mt-0.5">{completedCount}/{goals.length} completed</p>
        </div>
        {canEdit && (
          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 text-xs -mr-1"
            onClick={() => setShowAdd(!showAdd)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Goal
          </Button>
        )}
      </div>

      {/* Add goal form */}
      {showAdd && (
        <form onSubmit={handleAddGoal} className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">Goal Title *</Label>
            <Input value={form.title} onChange={(e) => setF("title", e.target.value)} required placeholder="e.g. Improve customer satisfaction score" className="h-8 border-slate-200 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">Description</Label>
            <Textarea value={form.description} onChange={(e) => setF("description", e.target.value)} rows={2} className="border-slate-200 text-sm resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Due Date</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setF("dueDate", e.target.value)} className="h-8 border-slate-200 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">KPI Unit</Label>
              <Input value={form.kpiUnit} onChange={(e) => setF("kpiUnit", e.target.value)} placeholder="%, units, $..." className="h-8 border-slate-200 text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">KPI Target</Label>
            <Input type="number" value={form.kpiTarget} onChange={(e) => setF("kpiTarget", e.target.value)} placeholder="Target value" className="h-8 border-slate-200 text-sm" />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1 h-8 border-slate-200 text-xs" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add Goal"}
            </Button>
          </div>
        </form>
      )}

      {/* Goals list */}
      <div className="space-y-2">
        {goals.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">No goals added yet</p>
        ) : (
          goals.map((goal) => {
            const Icon = STATUS_ICONS[goal.status];
            const isExpanded = expanded === goal.id;
            return (
              <div key={goal.id} className="border border-slate-100 rounded-lg overflow-hidden">
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : goal.id)}
                >
                  {canEdit ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = goal.status === "NOT_STARTED" ? "IN_PROGRESS" : goal.status === "IN_PROGRESS" ? "COMPLETED" : "NOT_STARTED";
                        handleStatusChange(goal.id, next);
                      }}
                      className="shrink-0"
                    >
                      <Icon className={cn("w-4 h-4 transition-colors", STATUS_STYLES[goal.status])} />
                    </button>
                  ) : (
                    <Icon className={cn("w-4 h-4 shrink-0", STATUS_STYLES[goal.status])} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium truncate", goal.status === "COMPLETED" ? "line-through text-slate-400" : "text-slate-700")}>
                      {goal.title}
                    </p>
                    {goal.kpiTarget && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        Target: {Number(goal.kpiTarget)}{goal.kpiUnit}
                        {goal.kpiActual != null && ` · Actual: ${Number(goal.kpiActual)}${goal.kpiUnit}`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-semibold text-slate-500 tabular-nums">{goal.progress}%</span>
                    <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform", isExpanded && "rotate-180")} />
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1 bg-slate-100">
                  <div
                    className={cn("h-full transition-all", goal.status === "COMPLETED" ? "bg-green-400" : "bg-blue-400")}
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-2 bg-slate-50 border-t border-slate-100 space-y-3">
                    {goal.description && <p className="text-xs text-slate-600 leading-relaxed">{goal.description}</p>}
                    {goal.dueDate && (
                      <p className="text-xs text-slate-400">
                        Due: {new Date(goal.dueDate).toLocaleDateString()}
                      </p>
                    )}

                    {canEdit && goal.status !== "COMPLETED" && goal.status !== "CANCELLED" && (
                      <div className="space-y-2">
                        {progEdit?.id === goal.id ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-slate-500 shrink-0">Progress</Label>
                              <Input
                                type="number" min="0" max="100"
                                value={progEdit.progress}
                                onChange={(e) => setProgEdit(p => p ? { ...p, progress: parseInt(e.target.value) || 0 } : null)}
                                className="h-7 border-slate-200 text-xs w-20"
                              />
                              <span className="text-xs text-slate-400">%</span>
                            </div>
                            {goal.kpiTarget && (
                              <div className="flex items-center gap-2">
                                <Label className="text-xs text-slate-500 shrink-0">Actual</Label>
                                <Input
                                  type="number"
                                  value={progEdit.kpiActual}
                                  onChange={(e) => setProgEdit(p => p ? { ...p, kpiActual: e.target.value } : null)}
                                  className="h-7 border-slate-200 text-xs w-24"
                                />
                                <span className="text-xs text-slate-400">{goal.kpiUnit}</span>
                              </div>
                            )}
                            <div className="flex gap-1.5">
                              <Button type="button" size="sm" className="h-6 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3"
                                onClick={() => handleProgressSave(goal.id)}>Save</Button>
                              <Button type="button" variant="ghost" size="sm" className="h-6 text-xs text-slate-400 px-2"
                                onClick={() => setProgEdit(null)}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <Button type="button" variant="outline" size="sm" className="h-6 text-xs border-slate-200 text-slate-500"
                            onClick={() => setProgEdit({ id: goal.id, progress: goal.progress, kpiActual: goal.kpiActual ? String(goal.kpiActual) : "" })}>
                            Update Progress
                          </Button>
                        )}
                      </div>
                    )}

                    {canEdit && (
                      <button
                        onClick={() => handleDelete(goal.id)}
                        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" /> Delete goal
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
