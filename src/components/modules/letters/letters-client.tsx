"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createOfficialLetter,
  deleteOfficialLetter,
} from "@/actions/hr-operations.actions";
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
import { Loader2, Plus, FileText, Download, Trash2, Eye, X } from "lucide-react";
import { cn } from "@/lib/utils";

const LETTER_TYPES = [
  "WARNING", "OFFER", "TERMINATION", "EXPERIENCE",
  "SALARY_REVISION", "PROMOTION", "TRANSFER",
];

const TYPE_STYLES: Record<string, string> = {
  WARNING:        "bg-red-100 text-red-700",
  OFFER:          "bg-green-100 text-green-700",
  TERMINATION:    "bg-red-200 text-red-800",
  EXPERIENCE:     "bg-blue-100 text-blue-700",
  SALARY_REVISION:"bg-purple-100 text-purple-700",
  PROMOTION:      "bg-yellow-100 text-yellow-700",
  TRANSFER:       "bg-indigo-100 text-indigo-700",
};

type Props = {
  letters:        any[];
  employees:      { id: string; firstName: string; lastName: string; employeeCode: string }[];
  isHR:           boolean;
  organizationId: string;
  orgSlug:        string;
};

export function LettersClient({ letters, employees, isHR, organizationId, orgSlug }: Props) {
  const router = useRouter();
  const [showForm,   setShowForm]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [filter,     setFilter]     = useState("ALL");
  const [viewLetter, setViewLetter] = useState<any>(null);
  const [form, setForm] = useState({
    employeeId: "",
    type:       "EXPERIENCE",
    subject:    "",
    content:    "",
    issuedAt:   new Date().toISOString().split("T")[0],
  });

  const filtered =
    filter === "ALL"
      ? letters
      : letters.filter((l: any) => l.type === filter);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await createOfficialLetter({
      employeeId:    form.employeeId,
      organizationId,
      type:          form.type as any,
      subject:       form.subject,
      content:       form.content,
      issuedAt:      form.issuedAt,
    });
    setLoading(false);
    setShowForm(false);
    setForm({ employeeId: "", type: "EXPERIENCE", subject: "", content: "", issuedAt: new Date().toISOString().split("T")[0] });
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this letter?")) return;
    setLoading(true);
    await deleteOfficialLetter(id);
    setLoading(false);
    router.refresh();
  }

  function handlePrint(letter: any) {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>${letter.subject}</title>
      <style>body{font-family:Arial,sans-serif;max-width:700px;margin:60px auto;color:#1e293b;line-height:1.7}
      h1{font-size:1.2rem;margin-bottom:4px}p{margin:4px 0}.meta{color:#64748b;font-size:0.85rem;margin-bottom:30px}
      .content{white-space:pre-wrap;border-top:1px solid #e2e8f0;padding-top:20px;margin-top:20px}
      </style></head><body>
      <h1>${letter.subject}</h1>
      <div class="meta">
        To: ${letter.employee.firstName} ${letter.employee.lastName} (${letter.employee.employeeCode})<br/>
        Type: ${letter.type.replace(/_/g," ")}<br/>
        Date: ${new Date(letter.issuedAt).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}
      </div>
      <div class="content">${letter.content}</div>
      </body></html>
    `);
    win.document.close();
    win.print();
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Official Letters</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isHR ? "Issue and manage official correspondence" : "Your official letters and documents"}
          </p>
        </div>
        {isHR && (
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-1.5" /> New Letter
          </Button>
        )}
      </div>

      {/* Form */}
      {showForm && isHR && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Compose Letter</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Employee *
                </Label>
                <Select
                  value={form.employeeId}
                  onValueChange={(v) => setForm((p) => ({ ...p, employeeId: v }))}
                >
                  <SelectTrigger className="border-slate-200">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.firstName} {e.lastName} ({e.employeeCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Letter Type *
                </Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}
                >
                  <SelectTrigger className="border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LETTER_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Subject *
                </Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                  required
                  placeholder="Letter subject line"
                  className="border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Issue Date
                </Label>
                <Input
                  type="date"
                  value={form.issuedAt}
                  onChange={(e) => setForm((p) => ({ ...p, issuedAt: e.target.value }))}
                  className="border-slate-200"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Content *
                </Label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                  required
                  rows={6}
                  placeholder="Write the letter body here..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
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
                disabled={loading || !form.employeeId}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Issue Letter"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {["ALL", ...LETTER_TYPES].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              filter === t
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            )}
          >
            {t.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Letter list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No letters found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
          {filtered.map((letter: any) => (
            <div
              key={letter.id}
              className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800">
                      {letter.subject}
                    </p>
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                        TYPE_STYLES[letter.type] ?? "bg-slate-100 text-slate-500"
                      )}
                    >
                      {letter.type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isHR
                      ? `To: ${letter.employee.firstName} ${letter.employee.lastName} · `
                      : ""}
                    {new Date(letter.issuedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-slate-200 px-2"
                  onClick={() => setViewLetter(letter)}
                >
                  <Eye className="w-3.5 h-3.5 mr-1" /> View
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-slate-200 px-2"
                  onClick={() => handlePrint(letter)}
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> Print
                </Button>
                {isHR && (
                  <button
                    onClick={() => handleDelete(letter.id)}
                    className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Letter preview modal */}
      {viewLetter && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-slate-900">{viewLetter.subject}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {viewLetter.type.replace(/_/g, " ")} ·{" "}
                  {new Date(viewLetter.issuedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <button
                onClick={() => setViewLetter(null)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="px-6 py-5">
              <div className="mb-4 p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
                <strong>To:</strong> {viewLetter.employee.firstName} {viewLetter.employee.lastName} (
                {viewLetter.employee.employeeCode})
              </div>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {viewLetter.content}
              </p>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-slate-100">
              <Button
                variant="outline"
                className="border-slate-200"
                onClick={() => setViewLetter(null)}
              >
                Close
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => handlePrint(viewLetter)}
              >
                <Download className="w-4 h-4 mr-1.5" /> Print / Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
