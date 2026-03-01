"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createOnboardingTemplate,
  assignOnboarding,
  completeOnboardingTask,
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
import { Switch } from "@/components/ui/switch";
import {
  Loader2,
  Plus,
  ClipboardList,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  dueInDays: number;
  isRequired: boolean;
  order: number;
};

type Template = {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  tasks: Task[];
  _count: { tasks: number };
};

type OnboardingRecord = {
  id: string;
  progress: number;
  startedAt: string;
  completedAt: string | null;
  employee: { firstName: string; lastName: string; employeeCode: string; hireDate: string };
  tasks: {
    id: string;
    isCompleted: boolean;
    completedAt: string | null;
    notes: string | null;
    task: Task;
  }[];
};

type MyOnboarding = OnboardingRecord | null;

type Props = {
  templates:      Template[];
  onboardingList: OnboardingRecord[];
  employees:      { id: string; firstName: string; lastName: string; employeeCode: string }[];
  myOnboarding:   MyOnboarding;
  isHR:           boolean;
  organizationId: string;
  orgSlug:        string;
};

const TASK_CATEGORIES = ["IT_SETUP", "HR_DOCS", "TRAINING", "ORIENTATION", "ADMIN", "OTHER"];

export function OnboardingClient({
  templates,
  onboardingList,
  employees,
  myOnboarding,
  isHR,
  organizationId,
  orgSlug,
}: Props) {
  const router = useRouter();
  const [loading, setLoading]           = useState(false);
  const [tab, setTab]                   = useState<"overview" | "templates">(isHR ? "overview" : "overview");
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [assigningTemplate, setAssigningTemplate] = useState<string | null>(null);
  const [assignEmployeeId, setAssignEmployeeId] = useState("");

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    name: "", description: "", isDefault: false,
    tasks: [{ title: "", description: "", category: "HR_DOCS", dueInDays: 1, isRequired: true }],
  });

  function addTask() {
    setTemplateForm((p) => ({
      ...p,
      tasks: [...p.tasks, { title: "", description: "", category: "HR_DOCS", dueInDays: 1, isRequired: true }],
    }));
  }

  function removeTask(idx: number) {
    setTemplateForm((p) => ({
      ...p,
      tasks: p.tasks.filter((_, i) => i !== idx),
    }));
  }

  function updateTask(idx: number, field: string, value: any) {
    setTemplateForm((p) => ({
      ...p,
      tasks: p.tasks.map((t, i) => (i === idx ? { ...t, [field]: value } : t)),
    }));
  }

  async function handleCreateTemplate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await createOnboardingTemplate({
      organizationId,
      name:        templateForm.name,
      description: templateForm.description || undefined,
      isDefault:   templateForm.isDefault,
      tasks:       templateForm.tasks.map((t, i) => ({
        title:       t.title,
        description: t.description || undefined,
        category:    t.category,
        dueInDays:   t.dueInDays,
        isRequired:  t.isRequired,
        order:       i + 1,
      })),
    });
    setLoading(false);
    setShowTemplateForm(false);
    setTemplateForm({ name: "", description: "", isDefault: false, tasks: [{ title: "", description: "", category: "HR_DOCS", dueInDays: 1, isRequired: true }] });
    router.refresh();
  }

  async function handleAssign(templateId: string) {
    if (!assignEmployeeId) return;
    setLoading(true);
    await assignOnboarding({ employeeId: assignEmployeeId, templateId, organizationId });
    setLoading(false);
    setAssigningTemplate(null);
    setAssignEmployeeId("");
    router.refresh();
  }

  async function handleCompleteTask(onboardingTaskId: string, employeeId: string) {
    setLoading(true);
    await completeOnboardingTask({ onboardingTaskId, employeeId });
    setLoading(false);
    router.refresh();
  }

  // ── Employee's own onboarding view ──────────────────────────
  if (!isHR) {
    if (!myOnboarding) {
      return (
        <div className="space-y-5">
          <div>
            <h1 className="text-xl font-bold text-slate-900">My Onboarding</h1>
            <p className="text-sm text-slate-500 mt-0.5">Your onboarding checklist will appear here once assigned by HR</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 py-20 text-center">
            <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-medium">No onboarding assigned yet</p>
            <p className="text-slate-300 text-xs mt-1">Contact HR to get started</p>
          </div>
        </div>
      );
    }

    const completed = myOnboarding.tasks.filter((t) => t.isCompleted).length;
    const total     = myOnboarding.tasks.length;

    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My Onboarding</h1>
          <p className="text-sm text-slate-500 mt-0.5">Complete the tasks below to finish your onboarding</p>
        </div>

        {/* Progress bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-700">{completed} of {total} tasks completed</p>
            <span className={cn(
              "text-sm font-bold",
              myOnboarding.progress === 100 ? "text-green-600" : "text-blue-600"
            )}>
              {myOnboarding.progress}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5">
            <div
              className={cn("h-2.5 rounded-full transition-all", myOnboarding.progress === 100 ? "bg-green-500" : "bg-blue-500")}
              style={{ width: `${myOnboarding.progress}%` }}
            />
          </div>
          {myOnboarding.completedAt && (
            <p className="text-xs text-green-600 font-semibold mt-2">
              ✓ Onboarding completed on {new Date(myOnboarding.completedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          )}
        </div>

        {/* Tasks */}
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {myOnboarding.tasks.map((t) => (
            <div key={t.id} className={cn(
              "flex items-center gap-4 px-5 py-4 transition-colors",
              t.isCompleted ? "bg-green-50/40" : "hover:bg-slate-50"
            )}>
              <div className="shrink-0">
                {t.isCompleted ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : (
                  <Circle className="w-6 h-6 text-slate-300" />
                )}
              </div>
              <div className="flex-1">
                <p className={cn("text-sm font-semibold", t.isCompleted ? "text-slate-400 line-through" : "text-slate-800")}>
                  {t.task.title}
                  {t.task.isRequired && !t.isCompleted && (
                    <span className="ml-2 text-[10px] font-semibold bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full">REQUIRED</span>
                  )}
                </p>
                {t.task.description && (
                  <p className="text-xs text-slate-400 mt-0.5">{t.task.description}</p>
                )}
                <p className="text-xs text-slate-400 mt-0.5">
                  {t.task.category?.replace("_", " ")} · Due within {t.task.dueInDays} day{t.task.dueInDays !== 1 ? "s" : ""}
                </p>
                {t.isCompleted && t.completedAt && (
                  <p className="text-xs text-green-500 mt-0.5">
                    Completed {new Date(t.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                )}
              </div>
              {!t.isCompleted && (
                <Button
                  size="sm"
                  onClick={() => handleCompleteTask(t.id, myOnboarding.employee.employeeCode)}
                  disabled={loading}
                  className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 shrink-0"
                >
                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Mark Done"}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── HR View ──────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Onboarding</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage onboarding templates and employee progress</p>
        </div>
        {tab === "templates" && (
          <Button onClick={() => setShowTemplateForm(!showTemplateForm)} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-1.5" /> New Template
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { key: "overview",   label: `Active (${onboardingList.length})` },
          { key: "templates",  label: `Templates (${templates.length})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all",
              tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Templates tab ── */}
      {tab === "templates" && (
        <>
          {/* Create template form */}
          {showTemplateForm && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <h3 className="font-semibold text-slate-800">New Onboarding Template</h3>
              <form onSubmit={handleCreateTemplate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Template Name *</Label>
                    <Input
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm((p) => ({ ...p, name: e.target.value }))}
                      required
                      placeholder="Standard Engineer Onboarding"
                      className="border-slate-200"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</Label>
                    <Input
                      value={templateForm.description}
                      onChange={(e) => setTemplateForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Brief description..."
                      className="border-slate-200"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={templateForm.isDefault}
                    onCheckedChange={(v) => setTemplateForm((p) => ({ ...p, isDefault: v }))}
                  />
                  <Label className="text-sm text-slate-700">Set as default template</Label>
                </div>

                {/* Tasks */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tasks</Label>
                    <button type="button" onClick={addTask} className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add Task
                    </button>
                  </div>
                  {templateForm.tasks.map((task, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-start p-3 bg-slate-50 rounded-lg">
                      <div className="col-span-4">
                        <Input
                          value={task.title}
                          onChange={(e) => updateTask(idx, "title", e.target.value)}
                          required
                          placeholder="Task title"
                          className="border-slate-200 h-8 text-xs"
                        />
                      </div>
                      <div className="col-span-3">
                        <Select value={task.category} onValueChange={(v) => updateTask(idx, "category", v)}>
                          <SelectTrigger className="border-slate-200 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TASK_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="text-xs">{c.replace("_"," ")}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          min="1"
                          value={task.dueInDays}
                          onChange={(e) => updateTask(idx, "dueInDays", parseInt(e.target.value))}
                          className="border-slate-200 h-8 text-xs"
                          placeholder="Days"
                        />
                      </div>
                      <div className="col-span-2 flex items-center gap-1.5 pt-1">
                        <Switch
                          checked={task.isRequired}
                          onCheckedChange={(v) => updateTask(idx, "isRequired", v)}
                          className="scale-75"
                        />
                        <span className="text-[10px] text-slate-500">Req.</span>
                      </div>
                      <div className="col-span-1 flex justify-end pt-1">
                        {templateForm.tasks.length > 1 && (
                          <button type="button" onClick={() => removeTask(idx)}>
                            <X className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="border-slate-200" onClick={() => setShowTemplateForm(false)}>Cancel</Button>
                  <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Template"}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Templates list */}
          {templates.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
              <ClipboardList className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No templates yet</p>
              <p className="text-slate-300 text-xs mt-1">Create your first onboarding template</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((tmpl) => (
                <div key={tmpl.id} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800">{tmpl.name}</p>
                        {tmpl.isDefault && (
                          <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">DEFAULT</span>
                        )}
                      </div>
                      {tmpl.description && <p className="text-xs text-slate-400 mt-0.5">{tmpl.description}</p>}
                    </div>
                    <span className="text-xs text-slate-400">{tmpl._count.tasks} tasks</span>
                  </div>

                  {/* Task list preview */}
                  <div className="space-y-1 mb-3">
                    {tmpl.tasks.slice(0, 3).map((t) => (
                      <div key={t.id} className="flex items-center gap-2 text-xs text-slate-500">
                        <Circle className="w-3 h-3 text-slate-300 shrink-0" />
                        <span className="truncate">{t.title}</span>
                        {t.isRequired && <span className="text-red-400 shrink-0">*</span>}
                      </div>
                    ))}
                    {tmpl.tasks.length > 3 && (
                      <p className="text-xs text-slate-400 ml-5">+{tmpl.tasks.length - 3} more tasks</p>
                    )}
                  </div>

                  {/* Assign to employee */}
                  {employees.length > 0 && (
                    assigningTemplate === tmpl.id ? (
                      <div className="flex gap-2">
                        <Select value={assignEmployeeId} onValueChange={setAssignEmployeeId}>
                          <SelectTrigger className="h-8 text-xs border-slate-200 flex-1">
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map((e) => (
                              <SelectItem key={e.id} value={e.id} className="text-xs">
                                {e.firstName} {e.lastName} ({e.employeeCode})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" onClick={() => handleAssign(tmpl.id)} disabled={loading || !assignEmployeeId} className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3">
                          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Assign"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setAssigningTemplate(null)} className="h-8 border-slate-200 px-2">
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setAssigningTemplate(tmpl.id)} className="w-full h-8 text-xs border-slate-200">
                        <UserCheck className="w-3.5 h-3.5 mr-1.5" /> Assign to Employee
                      </Button>
                    )
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Overview tab ── */}
      {tab === "overview" && (
        <>
          {onboardingList.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
              <ClipboardList className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No active onboarding sessions</p>
              <p className="text-slate-300 text-xs mt-1">Assign a template to a new employee to get started</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="divide-y divide-slate-100">
                {onboardingList.map((ob) => {
                  const isExpanded = expandedEmployee === ob.id;
                  const completed  = ob.tasks.filter((t) => t.isCompleted).length;
                  return (
                    <div key={ob.id}>
                      <button
                        onClick={() => setExpandedEmployee(isExpanded ? null : ob.id)}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                            <ClipboardList className="w-5 h-5 text-blue-500" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {ob.employee.firstName} {ob.employee.lastName}
                              <span className="text-xs text-slate-400 font-normal ml-1.5">({ob.employee.employeeCode})</span>
                            </p>
                            <p className="text-xs text-slate-400">
                              Hired {new Date(ob.employee.hireDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} ·
                              {completed}/{ob.tasks.length} tasks done
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {/* Mini progress bar */}
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-slate-100 rounded-full h-1.5">
                              <div
                                className={cn("h-1.5 rounded-full", ob.progress === 100 ? "bg-green-500" : "bg-blue-500")}
                                style={{ width: `${ob.progress}%` }}
                              />
                            </div>
                            <span className={cn("text-xs font-bold tabular-nums", ob.progress === 100 ? "text-green-600" : "text-blue-600")}>
                              {ob.progress}%
                            </span>
                          </div>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>
                      </button>

                      {/* Expanded tasks */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 divide-y divide-slate-50">
                          {ob.tasks.map((t) => (
                            <div key={t.id} className={cn("flex items-center gap-3 px-14 py-3", t.isCompleted && "bg-green-50/30")}>
                              {t.isCompleted
                                ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                : <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                              }
                              <div className="flex-1">
                                <p className={cn("text-xs font-medium", t.isCompleted && "text-slate-400 line-through")}>{t.task.title}</p>
                                <p className="text-[10px] text-slate-400">{t.task.category?.replace("_", " ")} · Due in {t.task.dueInDays}d</p>
                              </div>
                              {!t.isCompleted && (
                                <Button
                                  size="sm"
                                  onClick={() => handleCompleteTask(t.id, ob.employee.employeeCode)}
                                  disabled={loading}
                                  className="h-6 text-[10px] bg-blue-600 hover:bg-blue-700 text-white px-2"
                                >
                                  Done
                                </Button>
                              )}
                              {t.isCompleted && t.completedAt && (
                                <span className="text-[10px] text-green-500">
                                  {new Date(t.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
