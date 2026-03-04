"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSurvey, deleteSurvey, toggleSurveyActive, submitSurveyResponse } from "@/actions/features.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ClipboardList, Trash2, X, Loader2, Check, ChevronRight, Star, BarChart3, Eye, EyeOff, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type Question = { id: string; text: string; type: "TEXT" | "RATING" | "YESNO" | "MULTIPLE"; options?: string[] };
type Survey = { id: string; title: string; description: string | null; questions: Question[]; isAnonymous: boolean; deadline: string | null; isActive: boolean; createdAt: string; _count: { responses: number } };

type Props = {
  surveys: Survey[]; isHR: boolean; employeeId: string | null;
  respondedIds: string[]; organizationId: string; orgSlug: string;
};

export function SurveysClient({ surveys, isHR, employeeId, respondedIds, organizationId }: Props) {
  const router = useRouter();
  const [view,         setView]         = useState<"list" | "create" | "respond" | "results">("list");
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [deletingId,   setDeletingId]   = useState<string | null>(null);
  const [answers,      setAnswers]      = useState<Record<string, any>>({});
  const [submitted,    setSubmitted]    = useState(false);

  // Create form state
  const [sTitle, setSTitle]     = useState("");
  const [sDesc,  setSDesc]      = useState("");
  const [sAnon,  setSAnon]      = useState(false);
  const [sDead,  setSDead]      = useState("");
  const [questions, setQuestions] = useState<Question[]>([
    { id: "q1", text: "", type: "TEXT" }
  ]);

  function addQuestion() {
    setQuestions(q => [...q, { id: `q${Date.now()}`, text: "", type: "TEXT" }]);
  }
  function removeQuestion(id: string) {
    setQuestions(q => q.filter(x => x.id !== id));
  }
  function updateQuestion(id: string, updates: Partial<Question>) {
    setQuestions(q => q.map(x => x.id === id ? { ...x, ...updates } : x));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (questions.some(q => !q.text.trim())) return;
    setLoading(true);
    await createSurvey({ organizationId, title: sTitle, description: sDesc || undefined, questions, isAnonymous: sAnon, deadline: sDead || undefined });
    setLoading(false);
    setView("list");
    router.refresh();
  }

  async function handleDelete(id: string) {
    setLoading(true); await deleteSurvey(id); setLoading(false); setDeletingId(null); router.refresh();
  }

  async function handleToggle(id: string, current: boolean) {
    await toggleSurveyActive(id, !current); router.refresh();
  }

  async function handleSubmitResponse(e: React.FormEvent) {
    e.preventDefault();
    if (!activeSurvey) return;
    setLoading(true);
    await submitSurveyResponse({ surveyId: activeSurvey.id, employeeId: activeSurvey.isAnonymous ? undefined : (employeeId ?? undefined), answers });
    setLoading(false);
    setSubmitted(true);
    setTimeout(() => { setView("list"); setSubmitted(false); setAnswers({}); router.refresh(); }, 2000);
  }

  // ── CREATE VIEW ──────────────────────────────────────────────
  if (view === "create") {
    return (
      <div className="space-y-5 max-w-2xl">
        <div className="flex items-center gap-3">
          <button onClick={() => setView("list")} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
          <h1 className="text-xl font-bold text-slate-900">Create Survey</h1>
        </div>
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700">Survey Details</h3>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Title *</Label>
              <Input value={sTitle} onChange={e => setSTitle(e.target.value)} required className="border-slate-200" placeholder="e.g. Employee Satisfaction Survey" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</Label>
              <textarea value={sDesc} onChange={e => setSDesc(e.target.value)} rows={2} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" placeholder="Optional description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Deadline</Label>
                <Input type="datetime-local" value={sDead} onChange={e => setSDead(e.target.value)} className="border-slate-200" />
              </div>
              <div className="flex items-end gap-2 pb-0.5">
                <input type="checkbox" id="anon" checked={sAnon} onChange={e => setSAnon(e.target.checked)} className="rounded" />
                <label htmlFor="anon" className="text-sm font-medium text-slate-700">Anonymous responses</label>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700">Questions</h3>
            {questions.map((q, idx) => (
              <div key={q.id} className="p-4 bg-slate-50 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 w-5">Q{idx + 1}</span>
                  <Input value={q.text} onChange={e => updateQuestion(q.id, { text: e.target.value })} className="flex-1 border-slate-200 bg-white" placeholder="Question text..." required />
                  <Select value={q.type} onValueChange={v => updateQuestion(q.id, { type: v as any, options: undefined })}>
                    <SelectTrigger className="w-32 border-slate-200 bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TEXT">Text</SelectItem>
                      <SelectItem value="RATING">Rating (1-5)</SelectItem>
                      <SelectItem value="YESNO">Yes / No</SelectItem>
                      <SelectItem value="MULTIPLE">Multiple Choice</SelectItem>
                    </SelectContent>
                  </Select>
                  {questions.length > 1 && (
                    <button type="button" onClick={() => removeQuestion(q.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                  )}
                </div>
                {q.type === "MULTIPLE" && (
                  <div className="ml-7 space-y-1.5">
                    <p className="text-xs text-slate-500">Options (one per line)</p>
                    <textarea
                      value={(q.options ?? []).join("\n")}
                      onChange={e => updateQuestion(q.id, { options: e.target.value.split("\n").filter(Boolean) })}
                      rows={3} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                      placeholder={"Option A\nOption B\nOption C"}
                    />
                  </div>
                )}
              </div>
            ))}
            <button type="button" onClick={addQuestion} className="w-full py-2 border-2 border-dashed border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Question
            </button>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="border-slate-200" onClick={() => setView("list")}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Survey"}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // ── RESPOND VIEW ─────────────────────────────────────────────
  if (view === "respond" && activeSurvey) {
    return (
      <div className="space-y-5 max-w-xl">
        <div className="flex items-center gap-3">
          <button onClick={() => { setView("list"); setAnswers({}); }} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{activeSurvey.title}</h1>
            {activeSurvey.description && <p className="text-sm text-slate-500">{activeSurvey.description}</p>}
          </div>
        </div>
        {submitted ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4"><Check className="w-8 h-8 text-green-500" /></div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Response Submitted!</h3>
            <p className="text-sm text-slate-500">Thank you for your feedback.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmitResponse} className="space-y-4">
            {activeSurvey.questions.map((q, idx) => (
              <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-5">
                <p className="text-sm font-semibold text-slate-800 mb-3"><span className="text-blue-500 mr-1.5">{idx + 1}.</span>{q.text}</p>
                {q.type === "TEXT" && (
                  <textarea value={answers[q.id] ?? ""} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} rows={3} required className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" placeholder="Your answer..." />
                )}
                {q.type === "RATING" && (
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} type="button" onClick={() => setAnswers(a => ({ ...a, [q.id]: n }))}
                        className={cn("w-10 h-10 rounded-xl border-2 font-bold text-sm transition-all", answers[q.id] === n ? "border-blue-500 bg-blue-50 text-blue-600" : "border-slate-200 text-slate-500 hover:border-slate-300")}>
                        {n}
                      </button>
                    ))}
                    {answers[q.id] && <div className="flex items-center ml-2">{Array.from({ length: answers[q.id] }).map((_, i) => <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />)}</div>}
                  </div>
                )}
                {q.type === "YESNO" && (
                  <div className="flex gap-3">
                    {["Yes", "No"].map(opt => (
                      <button key={opt} type="button" onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))}
                        className={cn("px-5 py-2 rounded-xl border-2 font-semibold text-sm transition-all", answers[q.id] === opt ? "border-blue-500 bg-blue-50 text-blue-600" : "border-slate-200 text-slate-500 hover:border-slate-300")}>
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
                {q.type === "MULTIPLE" && (
                  <div className="space-y-2">
                    {(q.options ?? []).map(opt => (
                      <button key={opt} type="button" onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))}
                        className={cn("w-full text-left px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all flex items-center gap-2",
                          answers[q.id] === opt ? "border-blue-500 bg-blue-50 text-blue-600" : "border-slate-200 text-slate-600 hover:border-slate-300")}>
                        <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0", answers[q.id] === opt ? "border-blue-500 bg-blue-500" : "border-slate-300")}>
                          {answers[q.id] === opt && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="border-slate-200" onClick={() => { setView("list"); setAnswers({}); }}>Cancel</Button>
              <Button type="submit" disabled={loading || activeSurvey.questions.some(q => !answers[q.id] && q.type !== "TEXT")} className="bg-blue-600 hover:bg-blue-700 text-white">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Response"}
              </Button>
            </div>
          </form>
        )}
      </div>
    );
  }

  // ── RESULTS VIEW ─────────────────────────────────────────────
  if (view === "results" && activeSurvey) {
    const responses = (activeSurvey as any).responses ?? [];
    return (
      <div className="space-y-5 max-w-2xl">
        <div className="flex items-center gap-3">
          <button onClick={() => setView("list")} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{activeSurvey.title} — Results</h1>
            <p className="text-sm text-slate-500">{responses.length} response{responses.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        {activeSurvey.questions.map((q, idx) => {
          const qAnswers = responses.map((r: any) => r.answers[q.id]).filter(Boolean);
          return (
            <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-sm font-semibold text-slate-800 mb-4"><span className="text-blue-500 mr-1.5">{idx + 1}.</span>{q.text}</p>
              {q.type === "RATING" && (
                <div className="space-y-1.5">
                  {[5, 4, 3, 2, 1].map(n => {
                    const count = qAnswers.filter((a: any) => a === n).length;
                    const pct   = qAnswers.length ? Math.round((count / qAnswers.length) * 100) : 0;
                    return (
                      <div key={n} className="flex items-center gap-2">
                        <span className="text-xs font-semibold w-3 text-slate-500">{n}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-slate-400 w-8 text-right">{count}</span>
                      </div>
                    );
                  })}
                  <p className="text-xs text-slate-400 mt-2">Avg: {qAnswers.length ? (qAnswers.reduce((a: number, b: number) => a + b, 0) / qAnswers.length).toFixed(1) : "—"}</p>
                </div>
              )}
              {q.type === "YESNO" && (
                <div className="flex gap-4">
                  {["Yes", "No"].map(opt => {
                    const count = qAnswers.filter((a: any) => a === opt).length;
                    const pct   = qAnswers.length ? Math.round((count / qAnswers.length) * 100) : 0;
                    return (
                      <div key={opt} className="flex-1 text-center p-3 bg-slate-50 rounded-xl">
                        <p className="text-2xl font-bold text-slate-800">{pct}%</p>
                        <p className="text-xs text-slate-400">{opt} ({count})</p>
                      </div>
                    );
                  })}
                </div>
              )}
              {q.type === "MULTIPLE" && (
                <div className="space-y-1.5">
                  {(q.options ?? []).map(opt => {
                    const count = qAnswers.filter((a: any) => a === opt).length;
                    const pct   = qAnswers.length ? Math.round((count / qAnswers.length) * 100) : 0;
                    return (
                      <div key={opt} className="flex items-center gap-2">
                        <span className="text-xs text-slate-600 w-28 truncate">{opt}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-2">
                          <div className="bg-violet-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-slate-400 w-8 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {q.type === "TEXT" && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {qAnswers.length === 0 ? <p className="text-xs text-slate-400">No responses yet</p> : qAnswers.map((a: string, i: number) => (
                    <div key={i} className="p-2.5 bg-slate-50 rounded-lg text-xs text-slate-600">"{a}"</div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ── LIST VIEW ────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Surveys</h1>
          <p className="text-sm text-slate-500 mt-0.5">Collect employee feedback and insights</p>
        </div>
        {isHR && <Button onClick={() => setView("create")} className="bg-blue-600 hover:bg-blue-700 text-white"><Plus className="w-4 h-4 mr-1.5" />New Survey</Button>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Surveys",   value: surveys.length,                         icon: ClipboardList, color: "bg-blue-50 text-blue-600" },
          { label: "Active Surveys",  value: surveys.filter(s => s.isActive).length,  icon: Eye,           color: "bg-green-50 text-green-600" },
          { label: "Total Responses", value: surveys.reduce((a, s) => a + s._count.responses, 0), icon: Users, color: "bg-violet-50 text-violet-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", stat.color)}><stat.icon className="w-5 h-5" /></div>
            <div><p className="text-2xl font-bold text-slate-900">{stat.value}</p><p className="text-xs text-slate-500">{stat.label}</p></div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {surveys.length === 0 ? (
          <div className="py-16 text-center"><ClipboardList className="w-10 h-10 text-slate-200 mx-auto mb-3" /><p className="text-slate-400 text-sm">No surveys yet</p></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {surveys.map((survey) => {
              const hasResponded = respondedIds.includes(survey.id);
              const isExpired    = survey.deadline && new Date(survey.deadline) < new Date();
              return (
                <div key={survey.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", survey.isActive ? "bg-blue-50" : "bg-slate-100")}>
                    <ClipboardList className={cn("w-5 h-5", survey.isActive ? "text-blue-500" : "text-slate-400")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800">{survey.title}</p>
                      {survey.isAnonymous && <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded flex items-center gap-0.5"><EyeOff className="w-2.5 h-2.5" />Anonymous</span>}
                      {!survey.isActive && <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">CLOSED</span>}
                      {isExpired && <span className="text-[10px] font-semibold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">EXPIRED</span>}
                      {hasResponded && <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Check className="w-2.5 h-2.5" />Responded</span>}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{survey.questions.length} questions · {survey._count.responses} responses{survey.deadline ? ` · Deadline ${new Date(survey.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isHR && (
                      <>
                        <button onClick={() => { setActiveSurvey(survey); setView("results"); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600" title="View results"><BarChart3 className="w-4 h-4" /></button>
                        <button onClick={() => handleToggle(survey.id, survey.isActive)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" title={survey.isActive ? "Close survey" : "Open survey"}>
                          {survey.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        {deletingId === survey.id ? (
                          <div className="flex gap-1">
                            <button onClick={() => handleDelete(survey.id)} disabled={loading} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setDeletingId(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        ) : (
                          <button onClick={() => setDeletingId(survey.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" /></button>
                        )}
                      </>
                    )}
                    {!isHR && survey.isActive && !hasResponded && !isExpired && (
                      <Button onClick={() => { setActiveSurvey(survey); setView("respond"); }} className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3 gap-1">
                        Take Survey <ChevronRight className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
