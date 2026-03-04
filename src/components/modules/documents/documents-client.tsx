"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createPolicyDocument, updatePolicyDocument, deletePolicyDocument,
  createComplianceDocument, deleteComplianceDocument,
} from "@/actions/features.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, ShieldCheck, ExternalLink, Pencil, Trash2, X, Loader2, Check, AlertTriangle, ToggleLeft, ToggleRight } from "lucide-react";
import { cn } from "@/lib/utils";

const COMPLIANCE_TYPES = ["DATA_PRIVACY", "LABOR_LAW", "TAX", "HEALTH_SAFETY", "OTHER"];

type PolicyDoc = { id: string; title: string; content: string | null; fileUrl: string | null; version: string; isActive: boolean; publishedAt: string | null; createdAt: string; };
type ComplianceDoc = { id: string; title: string; type: string; jurisdiction: string | null; fileUrl: string | null; version: string | null; expiryDate: string | null; createdAt: string; };

type Props = {
  policyDocs: PolicyDoc[]; complianceDocs: ComplianceDoc[];
  isHR: boolean; organizationId: string; orgSlug: string;
};

export function DocumentsClient({ policyDocs, complianceDocs, isHR, organizationId }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"policy" | "compliance">("policy");
  const [showForm, setShowForm]   = useState(false);
  const [loading,  setLoading]    = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingDoc, setEditingDoc] = useState<PolicyDoc | null>(null);

  const [pForm, setPForm] = useState({ title: "", content: "", fileUrl: "", version: "1.0" });
  const [cForm, setCForm] = useState({ title: "", type: "OTHER", jurisdiction: "", fileUrl: "", version: "", expiryDate: "" });

  function openPolicyCreate() { setEditingDoc(null); setPForm({ title: "", content: "", fileUrl: "", version: "1.0" }); setShowForm(true); }
  function openPolicyEdit(doc: PolicyDoc) { setEditingDoc(doc); setPForm({ title: doc.title, content: doc.content ?? "", fileUrl: doc.fileUrl ?? "", version: doc.version }); setShowForm(true); }

  async function handlePolicySubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    if (editingDoc) {
      await updatePolicyDocument({ docId: editingDoc.id, title: pForm.title, content: pForm.content || undefined, fileUrl: pForm.fileUrl || undefined, version: pForm.version });
    } else {
      await createPolicyDocument({ organizationId, title: pForm.title, content: pForm.content || undefined, fileUrl: pForm.fileUrl || undefined, version: pForm.version });
    }
    setLoading(false); setShowForm(false); router.refresh();
  }

  async function handleComplianceSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    await createComplianceDocument({ organizationId, title: cForm.title, type: cForm.type, jurisdiction: cForm.jurisdiction || undefined, fileUrl: cForm.fileUrl || undefined, version: cForm.version || undefined, expiryDate: cForm.expiryDate || undefined });
    setLoading(false); setShowForm(false); router.refresh();
  }

  async function handleToggleActive(doc: PolicyDoc) {
    setLoading(true);
    await updatePolicyDocument({ docId: doc.id, isActive: !doc.isActive });
    setLoading(false); router.refresh();
  }

  async function handleDeletePolicy(id: string) { setLoading(true); await deletePolicyDocument(id); setLoading(false); setDeletingId(null); router.refresh(); }
  async function handleDeleteCompliance(id: string) { setLoading(true); await deleteComplianceDocument(id); setLoading(false); setDeletingId(null); router.refresh(); }

  const today = new Date();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Documents</h1>
          <p className="text-sm text-slate-500 mt-0.5">Policy documents and compliance records</p>
        </div>
        {isHR && (
          <Button onClick={() => { setShowForm(true); setEditingDoc(null); }} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-1.5" /> Add Document
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { key: "policy",     label: `Policy Documents (${policyDocs.length})`,     icon: FileText },
          { key: "compliance", label: `Compliance Records (${complianceDocs.length})`, icon: ShieldCheck },
        ].map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key as any); setShowForm(false); }}
            className={cn("flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all",
              tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && isHR && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">{editingDoc ? "Edit Policy Document" : tab === "policy" ? "New Policy Document" : "New Compliance Record"}</h3>

          {tab === "policy" ? (
            <form onSubmit={handlePolicySubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Title *</Label>
                  <Input value={pForm.title} onChange={e => setPForm(p => ({ ...p, title: e.target.value }))} required className="border-slate-200" placeholder="e.g. Employee Handbook" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Version *</Label>
                  <Input value={pForm.version} onChange={e => setPForm(p => ({ ...p, version: e.target.value }))} required className="border-slate-200" placeholder="e.g. 1.0" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">File URL</Label>
                <Input value={pForm.fileUrl} onChange={e => setPForm(p => ({ ...p, fileUrl: e.target.value }))} className="border-slate-200" placeholder="https://..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Content</Label>
                <textarea value={pForm.content} onChange={e => setPForm(p => ({ ...p, content: e.target.value }))} rows={4} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" placeholder="Document content or summary..." />
              </div>
              <div className="flex gap-2"><Button type="button" variant="outline" className="border-slate-200" onClick={() => setShowForm(false)}>Cancel</Button><Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : editingDoc ? "Save Changes" : "Create"}</Button></div>
            </form>
          ) : (
            <form onSubmit={handleComplianceSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Title *</Label>
                  <Input value={cForm.title} onChange={e => setCForm(p => ({ ...p, title: e.target.value }))} required className="border-slate-200" placeholder="e.g. GDPR Compliance Record" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Type *</Label>
                  <Select value={cForm.type} onValueChange={v => setCForm(p => ({ ...p, type: v }))}>
                    <SelectTrigger className="border-slate-200"><SelectValue /></SelectTrigger>
                    <SelectContent>{COMPLIANCE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Jurisdiction</Label>
                  <Input value={cForm.jurisdiction} onChange={e => setCForm(p => ({ ...p, jurisdiction: e.target.value }))} className="border-slate-200" placeholder="e.g. EU, USA" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Version</Label>
                  <Input value={cForm.version} onChange={e => setCForm(p => ({ ...p, version: e.target.value }))} className="border-slate-200" placeholder="e.g. 2.1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">File URL</Label>
                  <Input value={cForm.fileUrl} onChange={e => setCForm(p => ({ ...p, fileUrl: e.target.value }))} className="border-slate-200" placeholder="https://..." />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expiry Date</Label>
                  <Input type="date" value={cForm.expiryDate} onChange={e => setCForm(p => ({ ...p, expiryDate: e.target.value }))} className="border-slate-200" />
                </div>
              </div>
              <div className="flex gap-2"><Button type="button" variant="outline" className="border-slate-200" onClick={() => setShowForm(false)}>Cancel</Button><Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}</Button></div>
            </form>
          )}
        </div>
      )}

      {/* Policy docs list */}
      {tab === "policy" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {policyDocs.length === 0 ? (
            <div className="py-16 text-center"><FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" /><p className="text-slate-400 text-sm">No policy documents yet</p></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {policyDocs.map((doc) => (
                <div key={doc.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", doc.isActive ? "bg-blue-50" : "bg-slate-100")}>
                    <FileText className={cn("w-5 h-5", doc.isActive ? "text-blue-500" : "text-slate-400")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800">{doc.title}</p>
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">v{doc.version}</span>
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", doc.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500")}>{doc.isActive ? "ACTIVE" : "INACTIVE"}</span>
                    </div>
                    {doc.content && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-md">{doc.content}</p>}
                    <p className="text-[10px] text-slate-400 mt-1">Published {doc.publishedAt ? new Date(doc.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {doc.fileUrl && <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"><ExternalLink className="w-3.5 h-3.5 text-slate-400" /></a>}
                    {isHR && (
                      <>
                        <button onClick={() => handleToggleActive(doc)} disabled={loading} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                          {doc.isActive ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                        </button>
                        <button onClick={() => openPolicyEdit(doc)} className="p-1.5 rounded-lg hover:bg-slate-100"><Pencil className="w-3.5 h-3.5 text-slate-400" /></button>
                        {deletingId === doc.id ? (
                          <div className="flex gap-1">
                            <button onClick={() => handleDeletePolicy(doc.id)} disabled={loading} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setDeletingId(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        ) : (
                          <button onClick={() => setDeletingId(doc.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" /></button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Compliance docs list */}
      {tab === "compliance" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {complianceDocs.length === 0 ? (
            <div className="py-16 text-center"><ShieldCheck className="w-10 h-10 text-slate-200 mx-auto mb-3" /><p className="text-slate-400 text-sm">No compliance records yet</p></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {complianceDocs.map((doc) => {
                const isExpired = doc.expiryDate && new Date(doc.expiryDate) < today;
                const isExpiringSoon = doc.expiryDate && !isExpired && new Date(doc.expiryDate) < new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
                return (
                  <div key={doc.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", isExpired ? "bg-red-50" : isExpiringSoon ? "bg-orange-50" : "bg-green-50")}>
                      <ShieldCheck className={cn("w-5 h-5", isExpired ? "text-red-500" : isExpiringSoon ? "text-orange-500" : "text-green-500")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-800">{doc.title}</p>
                        <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{doc.type.replace("_", " ")}</span>
                        {doc.version && <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">v{doc.version}</span>}
                        {isExpired && <span className="text-[10px] font-semibold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><AlertTriangle className="w-2.5 h-2.5" />EXPIRED</span>}
                        {isExpiringSoon && <span className="text-[10px] font-semibold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">EXPIRING SOON</span>}
                      </div>
                      {doc.jurisdiction && <p className="text-xs text-slate-400 mt-0.5">Jurisdiction: {doc.jurisdiction}</p>}
                      {doc.expiryDate && <p className="text-[10px] text-slate-400 mt-1">Expires {new Date(doc.expiryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {doc.fileUrl && <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-slate-100"><ExternalLink className="w-3.5 h-3.5 text-slate-400" /></a>}
                      {isHR && (deletingId === doc.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => handleDeleteCompliance(doc.id)} disabled={loading} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setDeletingId(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <button onClick={() => setDeletingId(doc.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" /></button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
