"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createTraining,
  enrollInTraining,
  completeTraining,
  createCertification,
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
  GraduationCap,
  Award,
  Users,
  Calendar,
  CheckCircle2,
  BookOpen,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TRAINING_TYPES = ["ONLINE", "IN_PERSON", "WORKSHOP", "SEMINAR", "CERTIFICATION", "OTHER"];

const STATUS_STYLES: Record<string, string> = {
  ENROLLED:   "bg-blue-100 text-blue-700",
  COMPLETED:  "bg-green-100 text-green-700",
  DROPPED:    "bg-slate-100 text-slate-500",
};

type Training = {
  id:           string;
  title:        string;
  description:  string | null;
  provider:     string | null;
  type:         string | null;
  startDate:    string | null;
  endDate:      string | null;
  cost:         number | null;
  currency:     string;
  maxAttendees: number | null;
  _count:       { enrollments: number };
};

type Enrollment = {
  id:          string;
  status:      string;
  completedAt: string | null;
  score:       number | null;
  employee:    { id: string; firstName: string; lastName: string; employeeCode: string };
  training:    { title: string };
};

type Cert = {
  id:           string;
  name:         string;
  issuer:       string | null;
  issuedAt:     string | null;
  expiresAt:    string | null;
  credentialId: string | null;
};

type Props = {
  trainings:       Training[];
  employees:       { id: string; firstName: string; lastName: string; employeeCode: string }[];
  allEnrollments:  Enrollment[];
  myEnrollments:   (Enrollment & { training: Training })[];
  myCerts:         Cert[];
  isHR:            boolean;
  currentEmployeeId: string | null;
  organizationId:  string;
  orgSlug:         string;
};

export function TrainingClient({
  trainings,
  employees,
  allEnrollments,
  myEnrollments,
  myCerts,
  isHR,
  currentEmployeeId,
  organizationId,
  orgSlug,
}: Props) {
  const router = useRouter();
  const [loading,          setLoading]          = useState(false);
  const [tab,              setTab]              = useState<"trainings" | "enrollments" | "certifications">("trainings");
  const [showTrainingForm, setShowTrainingForm] = useState(false);
  const [showCertForm,     setShowCertForm]     = useState(false);
  const [enrollingId,      setEnrollingId]      = useState<string | null>(null);
  const [enrollEmployeeId, setEnrollEmployeeId] = useState("");

  const [trainingForm, setTrainingForm] = useState({
    title: "", description: "", provider: "", type: "ONLINE",
    startDate: "", endDate: "", cost: "", currency: "USD", maxAttendees: "",
  });

  const [certForm, setCertForm] = useState({
    name: "", issuer: "", issuedAt: "", expiresAt: "", credentialId: "",
  });

  // Stats
  const stats = {
    total:     trainings.length,
    enrolled:  isHR ? allEnrollments.filter((e) => e.status === "ENROLLED").length   : myEnrollments.filter((e) => e.status === "ENROLLED").length,
    completed: isHR ? allEnrollments.filter((e) => e.status === "COMPLETED").length  : myEnrollments.filter((e) => e.status === "COMPLETED").length,
    certs:     myCerts.length,
  };

  async function handleCreateTraining(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await createTraining({
      organizationId,
      title:        trainingForm.title,
      description:  trainingForm.description  || undefined,
      provider:     trainingForm.provider     || undefined,
      type:         trainingForm.type         || undefined,
      startDate:    trainingForm.startDate    || undefined,
      endDate:      trainingForm.endDate      || undefined,
      cost:         trainingForm.cost         ? parseFloat(trainingForm.cost) : undefined,
      currency:     trainingForm.currency,
      maxAttendees: trainingForm.maxAttendees ? parseInt(trainingForm.maxAttendees)  : undefined,
    });
    setLoading(false);
    setShowTrainingForm(false);
    setTrainingForm({ title: "", description: "", provider: "", type: "ONLINE", startDate: "", endDate: "", cost: "", currency: "USD", maxAttendees: "" });
    router.refresh();
  }

  async function handleEnroll(trainingId: string, employeeId: string) {
    setLoading(true);
    await enrollInTraining({ trainingId, employeeId, organizationId });
    setLoading(false);
    setEnrollingId(null);
    setEnrollEmployeeId("");
    router.refresh();
  }

  async function handleSelfEnroll(trainingId: string) {
    if (!currentEmployeeId) return;
    setLoading(true);
    await enrollInTraining({ trainingId, employeeId: currentEmployeeId, organizationId });
    setLoading(false);
    router.refresh();
  }

  async function handleComplete(enrollmentId: string) {
    setLoading(true);
    await completeTraining({ enrollmentId });
    setLoading(false);
    router.refresh();
  }

  async function handleCreateCert(e: React.FormEvent) {
    e.preventDefault();
    if (!currentEmployeeId) return;
    setLoading(true);
    await createCertification({
      employeeId:   currentEmployeeId,
      name:         certForm.name,
      issuer:       certForm.issuer       || undefined,
      issuedAt:     certForm.issuedAt     || undefined,
      expiresAt:    certForm.expiresAt    || undefined,
      credentialId: certForm.credentialId || undefined,
    });
    setLoading(false);
    setShowCertForm(false);
    setCertForm({ name: "", issuer: "", issuedAt: "", expiresAt: "", credentialId: "" });
    router.refresh();
  }

  const tabs = [
    { key: "trainings",      label: `Programs (${trainings.length})` },
    { key: "enrollments",    label: `Enrollments (${isHR ? allEnrollments.length : myEnrollments.length})` },
    { key: "certifications", label: `Certifications (${myCerts.length})` },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Training & Certifications</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isHR ? "Manage training programs and track employee development" : "Browse and enroll in training programs"}
          </p>
        </div>
        <div className="flex gap-2">
          {tab === "certifications" && currentEmployeeId && (
            <Button onClick={() => setShowCertForm(!showCertForm)} variant="outline" className="border-slate-200">
              <Plus className="w-4 h-4 mr-1.5" /> Add Certificate
            </Button>
          )}
          {tab === "trainings" && isHR && (
            <Button onClick={() => setShowTrainingForm(!showTrainingForm)} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-1.5" /> New Program
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Programs",   value: stats.total,     color: "text-slate-700",  bg: "bg-slate-50",  icon: BookOpen },
          { label: "Enrolled",   value: stats.enrolled,  color: "text-blue-600",   bg: "bg-blue-50",   icon: Users },
          { label: "Completed",  value: stats.completed, color: "text-green-600",  bg: "bg-green-50",  icon: CheckCircle2 },
          { label: "My Certs",   value: stats.certs,     color: "text-purple-600", bg: "bg-purple-50", icon: Award },
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

      {/* Tabs */}
      <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map((t) => (
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

      {/* ── TRAININGS TAB ── */}
      {tab === "trainings" && (
        <>
          {showTrainingForm && isHR && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-4">New Training Program</h3>
              <form onSubmit={handleCreateTraining} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Title *</Label>
                    <Input value={trainingForm.title} onChange={(e) => setTrainingForm((p) => ({ ...p, title: e.target.value }))} required placeholder="React Advanced Patterns" className="border-slate-200" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Provider</Label>
                    <Input value={trainingForm.provider} onChange={(e) => setTrainingForm((p) => ({ ...p, provider: e.target.value }))} placeholder="Udemy, Coursera..." className="border-slate-200" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Type</Label>
                    <Select value={trainingForm.type} onValueChange={(v) => setTrainingForm((p) => ({ ...p, type: v }))}>
                      <SelectTrigger className="border-slate-200"><SelectValue /></SelectTrigger>
                      <SelectContent>{TRAINING_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Start Date</Label>
                    <Input type="date" value={trainingForm.startDate} onChange={(e) => setTrainingForm((p) => ({ ...p, startDate: e.target.value }))} className="border-slate-200" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">End Date</Label>
                    <Input type="date" value={trainingForm.endDate} onChange={(e) => setTrainingForm((p) => ({ ...p, endDate: e.target.value }))} className="border-slate-200" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cost</Label>
                    <Input type="number" step="0.01" min="0" value={trainingForm.cost} onChange={(e) => setTrainingForm((p) => ({ ...p, cost: e.target.value }))} placeholder="0.00" className="border-slate-200" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Max Attendees</Label>
                    <Input type="number" min="1" value={trainingForm.maxAttendees} onChange={(e) => setTrainingForm((p) => ({ ...p, maxAttendees: e.target.value }))} placeholder="Unlimited" className="border-slate-200" />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</Label>
                    <Input value={trainingForm.description} onChange={(e) => setTrainingForm((p) => ({ ...p, description: e.target.value }))} placeholder="Brief description of this training..." className="border-slate-200" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="border-slate-200" onClick={() => setShowTrainingForm(false)}>Cancel</Button>
                  <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Program"}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {trainings.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
              <GraduationCap className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No training programs yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trainings.map((t) => {
                const isEnrolled = myEnrollments.some((e) => e.training.id === t.id);
                const isFull     = t.maxAttendees !== null && t._count.enrollments >= t.maxAttendees;
                return (
                  <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                          <GraduationCap className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{t.title}</p>
                          {t.provider && <p className="text-xs text-slate-400">{t.provider}</p>}
                        </div>
                      </div>
                      {t.type && (
                        <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full shrink-0">
                          {t.type}
                        </span>
                      )}
                    </div>

                    {t.description && (
                      <p className="text-xs text-slate-500 leading-relaxed">{t.description}</p>
                    )}

                    <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                      {t.startDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(t.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {t.endDate && ` → ${new Date(t.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {t._count.enrollments} enrolled
                        {t.maxAttendees && ` / ${t.maxAttendees}`}
                      </span>
                      {t.cost != null && t.cost > 0 && (
                        <span>{Number(t.cost).toLocaleString()} {t.currency}</span>
                      )}
                    </div>

                    {/* Actions */}
                    {isHR ? (
                      enrollingId === t.id ? (
                        <div className="flex gap-2">
                          <Select value={enrollEmployeeId} onValueChange={setEnrollEmployeeId}>
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
                          <Button size="sm" onClick={() => handleEnroll(t.id, enrollEmployeeId)} disabled={loading || !enrollEmployeeId} className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3">
                            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Enroll"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEnrollingId(null)} className="h-8 border-slate-200 px-2">
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setEnrollingId(t.id)} disabled={isFull} className="border-slate-200 h-8 text-xs">
                          <Users className="w-3.5 h-3.5 mr-1.5" />
                          {isFull ? "Full" : "Enroll Employee"}
                        </Button>
                      )
                    ) : (
                      isEnrolled ? (
                        <div className="flex items-center gap-2 text-xs text-green-600 font-semibold">
                          <CheckCircle2 className="w-4 h-4" /> Enrolled
                        </div>
                      ) : (
                        <Button size="sm" onClick={() => handleSelfEnroll(t.id)} disabled={loading || isFull || !currentEmployeeId} className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white">
                          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : isFull ? "Full" : "Enroll"}
                        </Button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── ENROLLMENTS TAB ── */}
      {tab === "enrollments" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {(isHR ? allEnrollments : myEnrollments).length === 0 ? (
            <div className="py-16 text-center">
              <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No enrollments yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {(isHR ? allEnrollments : myEnrollments).map((e: any) => (
                <div key={e.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{e.training.title}</p>
                      <p className="text-xs text-slate-400">
                        {isHR && `${e.employee.firstName} ${e.employee.lastName} · `}
                        Enrolled {new Date(e.createdAt ?? e.training.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {e.score != null && ` · Score: ${e.score}%`}
                        {e.completedAt && ` · Completed ${new Date(e.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", STATUS_STYLES[e.status] ?? "bg-slate-100 text-slate-500")}>
                      {e.status}
                    </span>
                    {e.status === "ENROLLED" && (isHR || !isHR) && (
                      <Button size="sm" onClick={() => handleComplete(e.id)} disabled={loading} className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white px-2.5">
                        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Mark Complete"}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CERTIFICATIONS TAB ── */}
      {tab === "certifications" && (
        <>
          {showCertForm && currentEmployeeId && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-4">Add Certification</h3>
              <form onSubmit={handleCreateCert} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Certification Name *</Label>
                    <Input value={certForm.name} onChange={(e) => setCertForm((p) => ({ ...p, name: e.target.value }))} required placeholder="AWS Solutions Architect" className="border-slate-200" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Issuing Organization</Label>
                    <Input value={certForm.issuer} onChange={(e) => setCertForm((p) => ({ ...p, issuer: e.target.value }))} placeholder="Amazon Web Services" className="border-slate-200" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Credential ID</Label>
                    <Input value={certForm.credentialId} onChange={(e) => setCertForm((p) => ({ ...p, credentialId: e.target.value }))} placeholder="ABC-123456" className="border-slate-200" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Issue Date</Label>
                    <Input type="date" value={certForm.issuedAt} onChange={(e) => setCertForm((p) => ({ ...p, issuedAt: e.target.value }))} className="border-slate-200" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expiry Date</Label>
                    <Input type="date" value={certForm.expiresAt} onChange={(e) => setCertForm((p) => ({ ...p, expiresAt: e.target.value }))} className="border-slate-200" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="border-slate-200" onClick={() => setShowCertForm(false)}>Cancel</Button>
                  <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Certificate"}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {myCerts.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
              <Award className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No certifications added yet</p>
              {currentEmployeeId && (
                <p className="text-slate-300 text-xs mt-1">Click "Add Certificate" to add yours</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {myCerts.map((c) => {
                const isExpired  = c.expiresAt && new Date(c.expiresAt) < new Date();
                const expiringSoon = c.expiresAt && !isExpired && (new Date(c.expiresAt).getTime() - Date.now()) < 30 * 86400000;
                return (
                  <div key={c.id} className={cn(
                    "bg-white rounded-xl border p-4 flex items-start gap-3",
                    isExpired ? "border-red-200 bg-red-50/20" : expiringSoon ? "border-orange-200 bg-orange-50/20" : "border-slate-200"
                  )}>
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      isExpired ? "bg-red-100" : "bg-purple-50"
                    )}>
                      <Award className={cn("w-5 h-5", isExpired ? "text-red-500" : "text-purple-500")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{c.name}</p>
                      {c.issuer && <p className="text-xs text-slate-500">{c.issuer}</p>}
                      {c.credentialId && <p className="text-xs text-slate-400 font-mono">{c.credentialId}</p>}
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {c.issuedAt && (
                          <span className="text-[10px] text-slate-400">
                            Issued: {new Date(c.issuedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                          </span>
                        )}
                        {c.expiresAt && (
                          <span className={cn(
                            "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                            isExpired ? "bg-red-100 text-red-600" : expiringSoon ? "bg-orange-100 text-orange-600" : "bg-slate-100 text-slate-500"
                          )}>
                            {isExpired ? "EXPIRED" : expiringSoon ? "EXPIRING SOON" : `Exp: ${new Date(c.expiresAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
