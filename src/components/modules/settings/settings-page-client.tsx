"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateOrganizationSettings,
  updatePayrollSettings,
  createBranch,
  createDepartment,
  createPosition,
  createLeaveType,
  toggleLeaveTypeActive,
} from "@/actions/settings.actions";
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
  Building2,
  Users,
  Briefcase,
  Calendar,
  Settings2,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "general", label: "General", icon: Settings2 },
  { id: "payroll", label: "Payroll", icon: Briefcase },
  { id: "branches", label: "Branches", icon: Building2 },
  { id: "structure", label: "Departments", icon: Users },
  { id: "leave", label: "Leave Types", icon: Calendar },
] as const;

type Tab = (typeof TABS)[number]["id"];

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];
const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "PKR",
  "SAR",
  "AED",
  "INR",
  "CAD",
  "AUD",
  "JPY",
  "SGD",
];
const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ar", label: "Arabic" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "es", label: "Spanish" },
];
const DATE_FORMATS = [
  "MM/DD/YYYY",
  "DD/MM/YYYY",
  "YYYY-MM-DD",
  "DD-MM-YYYY",
  "MMM DD, YYYY",
];
const LEAVE_CATEGORIES = [
  "ANNUAL",
  "SICK",
  "MATERNITY",
  "PATERNITY",
  "UNPAID",
  "EMERGENCY",
  "COMPENSATORY",
  "CUSTOM",
];
const LEAVE_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#ec4899",
];

type Props = {
  org: any;
  payrollSettings: any;
  branches: any[];
  departments: any[];
  positions: any[];
  leaveTypes: any[];
  organizationId: string;
  orgSlug: string;
};

export function SettingsPageClient({
  org,
  payrollSettings,
  branches,
  departments,
  positions,
  leaveTypes,
  organizationId,
  orgSlug,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("general");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // General settings form
  const [gen, setGen] = useState({
    name: org.name || "",
    email: org.email || "",
    phone: org.phone || "",
    website: org.website || "",
    address: org.address || "",
    city: org.city || "",
    country: org.country || "",
    timezone: org.timezone || "UTC",
    dateFormat: org.dateFormat || "MM/DD/YYYY",
    defaultCurrency: org.defaultCurrency || "USD",
    defaultLanguage: org.defaultLanguage || "en",
    fiscalYearStart: String(org.fiscalYearStart || 1),
    industry: org.industry || "",
    companySize: org.companySize || "",
    registrationNumber: org.registrationNumber || "",
    taxId: org.taxId || "",
  });

  // Payroll settings
  const [pay, setPay] = useState({
    currency: payrollSettings?.currency || org.defaultCurrency || "USD",
    payDay: String(payrollSettings?.payDay || 25),
  });

  // New branch form
  const [newBranch, setNewBranch] = useState({
    name: "",
    code: "",
    city: "",
    country: "",
    isHeadquarters: false,
  });
  const [showBranchForm, setShowBranchForm] = useState(false);

  // New dept form
  const [newDept, setNewDept] = useState({ name: "", code: "", branchId: "" });
  const [showDeptForm, setShowDeptForm] = useState(false);

  // New position form
  const [newPos, setNewPos] = useState({
    title: "",
    code: "",
    departmentId: "",
  });
  const [showPosForm, setShowPosForm] = useState(false);

  // New leave type form
  const [newLT, setNewLT] = useState({
    name: "",
    category: "ANNUAL",
    daysAllowed: "21",
    carryForward: false,
    isPaid: true,
    color: LEAVE_COLORS[0],
  });
  const [showLTForm, setShowLTForm] = useState(false);

  async function saveGeneral() {
    setLoading(true);
    setError("");
    setSaved(false);
    const res = await updateOrganizationSettings({
      organizationId,
      ...gen,
      fiscalYearStart: parseInt(gen.fiscalYearStart),
    });
    setLoading(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    router.refresh();
  }

  async function savePayroll() {
    setLoading(true);
    setError("");
    setSaved(false);
    await updatePayrollSettings({
      organizationId,
      currency: pay.currency,
      payDay: parseInt(pay.payDay),
    });
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    router.refresh();
  }

  async function handleAddBranch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await createBranch({ organizationId, ...newBranch });
    setLoading(false);
    setNewBranch({
      name: "",
      code: "",
      city: "",
      country: "",
      isHeadquarters: false,
    });
    setShowBranchForm(false);
    router.refresh();
  }

  async function handleAddDept(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await createDepartment({
      organizationId,
      ...newDept,
      branchId: newDept.branchId || undefined,
    });
    setLoading(false);
    setNewDept({ name: "", code: "", branchId: "" });
    setShowDeptForm(false);
    router.refresh();
  }

  async function handleAddPos(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await createPosition({
      organizationId,
      ...newPos,
      departmentId: newPos.departmentId || undefined,
    });
    setLoading(false);
    setNewPos({ title: "", code: "", departmentId: "" });
    setShowPosForm(false);
    router.refresh();
  }

  async function handleAddLT(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await createLeaveType({
      organizationId,
      ...newLT,
      daysAllowed: parseInt(newLT.daysAllowed),
    });
    setLoading(false);
    setNewLT({
      name: "",
      category: "ANNUAL",
      daysAllowed: "21",
      carryForward: false,
      isPaid: true,
      color: LEAVE_COLORS[0],
    });
    setShowLTForm(false);
    router.refresh();
  }

  return (
    <div className="flex gap-5">
      {/* Tab sidebar */}
      <div className="w-44 shrink-0">
        <nav className="space-y-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                tab === t.id
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-800",
              )}
            >
              <t.icon className="w-4 h-4 shrink-0" />
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* ── General ── */}
        {tab === "general" && (
          <Section title="Organization Settings">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Organization Name *">
                <Input
                  value={gen.name}
                  onChange={(e) =>
                    setGen((p) => ({ ...p, name: e.target.value }))
                  }
                  className="border-slate-200"
                />
              </Field>
              <Field label="Email *">
                <Input
                  value={gen.email}
                  onChange={(e) =>
                    setGen((p) => ({ ...p, email: e.target.value }))
                  }
                  className="border-slate-200"
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={gen.phone}
                  onChange={(e) =>
                    setGen((p) => ({ ...p, phone: e.target.value }))
                  }
                  className="border-slate-200"
                />
              </Field>
              <Field label="Website">
                <Input
                  value={gen.website}
                  onChange={(e) =>
                    setGen((p) => ({ ...p, website: e.target.value }))
                  }
                  className="border-slate-200"
                />
              </Field>
              <Field label="Address">
                <Input
                  value={gen.address}
                  onChange={(e) =>
                    setGen((p) => ({ ...p, address: e.target.value }))
                  }
                  className="border-slate-200"
                />
              </Field>
              <Field label="City">
                <Input
                  value={gen.city}
                  onChange={(e) =>
                    setGen((p) => ({ ...p, city: e.target.value }))
                  }
                  className="border-slate-200"
                />
              </Field>
              <Field label="Country">
                <Input
                  value={gen.country}
                  onChange={(e) =>
                    setGen((p) => ({ ...p, country: e.target.value }))
                  }
                  className="border-slate-200"
                />
              </Field>
              <Field label="Industry">
                <Input
                  value={gen.industry}
                  onChange={(e) =>
                    setGen((p) => ({ ...p, industry: e.target.value }))
                  }
                  className="border-slate-200"
                />
              </Field>
              <Field label="Company Size">
                <Input
                  value={gen.companySize}
                  onChange={(e) =>
                    setGen((p) => ({ ...p, companySize: e.target.value }))
                  }
                  placeholder="e.g. 50-100"
                  className="border-slate-200"
                />
              </Field>
              <Field label="Timezone">
                <Select
                  value={gen.timezone}
                  onValueChange={(v) => setGen((p) => ({ ...p, timezone: v }))}
                >
                  <SelectTrigger className="border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Date Format">
                <Select
                  value={gen.dateFormat}
                  onValueChange={(v) =>
                    setGen((p) => ({ ...p, dateFormat: v }))
                  }
                >
                  <SelectTrigger className="border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_FORMATS.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Default Currency">
                <Select
                  value={gen.defaultCurrency}
                  onValueChange={(v) =>
                    setGen((p) => ({ ...p, defaultCurrency: v }))
                  }
                >
                  <SelectTrigger className="border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Language">
                <Select
                  value={gen.defaultLanguage}
                  onValueChange={(v) =>
                    setGen((p) => ({ ...p, defaultLanguage: v }))
                  }
                >
                  <SelectTrigger className="border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Fiscal Year Start (Month)">
                <Select
                  value={gen.fiscalYearStart}
                  onValueChange={(v) =>
                    setGen((p) => ({ ...p, fiscalYearStart: v }))
                  }
                >
                  <SelectTrigger className="border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "January",
                      "February",
                      "March",
                      "April",
                      "May",
                      "June",
                      "July",
                      "August",
                      "September",
                      "October",
                      "November",
                      "December",
                    ].map((m, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <Field label="Registration Number">
                <Input
                  value={gen.registrationNumber}
                  onChange={(e) =>
                    setGen((p) => ({
                      ...p,
                      registrationNumber: e.target.value,
                    }))
                  }
                  className="border-slate-200"
                />
              </Field>
              <Field label="Tax ID">
                <Input
                  value={gen.taxId}
                  onChange={(e) =>
                    setGen((p) => ({ ...p, taxId: e.target.value }))
                  }
                  className="border-slate-200"
                />
              </Field>
            </div>
            <SaveBar
              loading={loading}
              saved={saved}
              error={error}
              onSave={saveGeneral}
            />
          </Section>
        )}

        {/* ── Payroll ── */}
        {tab === "payroll" && (
          <Section title="Payroll Settings">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Default Currency">
                <Select
                  value={pay.currency}
                  onValueChange={(v) => setPay((p) => ({ ...p, currency: v }))}
                >
                  <SelectTrigger className="border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Pay Day (day of month)">
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={pay.payDay}
                  onChange={(e) =>
                    setPay((p) => ({ ...p, payDay: e.target.value }))
                  }
                  className="border-slate-200"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Day of month when salaries are paid (1–31)
                </p>
              </Field>
            </div>
            <SaveBar
              loading={loading}
              saved={saved}
              error={error}
              onSave={savePayroll}
            />
          </Section>
        )}

        {/* ── Branches ── */}
        {tab === "branches" && (
          <Section
            title="Branches"
            action={
              <Button
                size="sm"
                variant="outline"
                className="border-slate-200 text-slate-600"
                onClick={() => setShowBranchForm(!showBranchForm)}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Branch
              </Button>
            }
          >
            {showBranchForm && (
              <form
                onSubmit={handleAddBranch}
                className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-3 mb-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Branch Name *">
                    <Input
                      value={newBranch.name}
                      onChange={(e) =>
                        setNewBranch((p) => ({ ...p, name: e.target.value }))
                      }
                      required
                      className="h-8 border-slate-200 text-sm"
                    />
                  </Field>
                  <Field label="Code">
                    <Input
                      value={newBranch.code}
                      onChange={(e) =>
                        setNewBranch((p) => ({ ...p, code: e.target.value }))
                      }
                      className="h-8 border-slate-200 text-sm"
                      placeholder="HQ"
                    />
                  </Field>
                  <Field label="City">
                    <Input
                      value={newBranch.city}
                      onChange={(e) =>
                        setNewBranch((p) => ({ ...p, city: e.target.value }))
                      }
                      className="h-8 border-slate-200 text-sm"
                    />
                  </Field>
                  <Field label="Country">
                    <Input
                      value={newBranch.country}
                      onChange={(e) =>
                        setNewBranch((p) => ({ ...p, country: e.target.value }))
                      }
                      className="h-8 border-slate-200 text-sm"
                    />
                  </Field>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newBranch.isHeadquarters}
                    onCheckedChange={(v) =>
                      setNewBranch((p) => ({ ...p, isHeadquarters: v }))
                    }
                  />
                  <Label className="text-sm text-slate-700">Headquarters</Label>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-200 text-sm h-8"
                    onClick={() => setShowBranchForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm h-8"
                  >
                    {loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "Add Branch"
                    )}
                  </Button>
                </div>
              </form>
            )}
            <div className="space-y-2">
              {branches.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3.5 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {b.name}{" "}
                        {b.code && (
                          <span className="text-slate-400 text-xs">
                            ({b.code})
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400">
                        {[b.city, b.country].filter(Boolean).join(", ") || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    {b.isHeadquarters && (
                      <span className="bg-blue-100 text-blue-600 font-semibold px-2 py-0.5 rounded-full">
                        HQ
                      </span>
                    )}
                    <span>{b._count.employees} employees</span>
                  </div>
                </div>
              ))}
              {branches.length === 0 && (
                <p className="text-slate-300 text-sm text-center py-8">
                  No branches yet
                </p>
              )}
            </div>
          </Section>
        )}

        {/* ── Departments & Positions ── */}
        {tab === "structure" && (
          <div className="space-y-5">
            <Section
              title="Departments"
              action={
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-200 text-slate-600"
                  onClick={() => setShowDeptForm(!showDeptForm)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Add
                </Button>
              }
            >
              {showDeptForm && (
                <form
                  onSubmit={handleAddDept}
                  className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-3 mb-4"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Name *">
                      <Input
                        value={newDept.name}
                        onChange={(e) =>
                          setNewDept((p) => ({ ...p, name: e.target.value }))
                        }
                        required
                        className="h-8 border-slate-200 text-sm"
                      />
                    </Field>
                    <Field label="Code">
                      <Input
                        value={newDept.code}
                        onChange={(e) =>
                          setNewDept((p) => ({ ...p, code: e.target.value }))
                        }
                        className="h-8 border-slate-200 text-sm"
                      />
                    </Field>
                    <Field label="Branch">
                      <Select
                        value={newDept.branchId || "NONE"}
                        onValueChange={(v) =>
                          setNewDept((p) => ({
                            ...p,
                            branchId: v === "NONE" ? "" : v,
                          }))
                        }
                      >
                        <SelectTrigger className="h-8 border-slate-200 text-sm">
                          <SelectValue placeholder="All branches" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">All branches</SelectItem>
                          {branches.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-slate-200 text-sm h-8"
                      onClick={() => setShowDeptForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm h-8"
                    >
                      {loading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        "Add"
                      )}
                    </Button>
                  </div>
                </form>
              )}
              <div className="space-y-2">
                {departments.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-100"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {d.name}{" "}
                        {d.code && (
                          <span className="text-slate-400 text-xs">
                            ({d.code})
                          </span>
                        )}
                      </p>
                      {d.branchId && (
                        <p className="text-xs text-slate-400">
                          {branches.find((b) => b.id === d.branchId)?.name ??
                            "—"}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">
                      {d._count.employees} employees
                    </span>
                  </div>
                ))}
                {departments.length === 0 && (
                  <p className="text-slate-300 text-sm text-center py-6">
                    No departments yet
                  </p>
                )}
              </div>
            </Section>

            <Section
              title="Positions"
              action={
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-200 text-slate-600"
                  onClick={() => setShowPosForm(!showPosForm)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Add
                </Button>
              }
            >
              {showPosForm && (
                <form
                  onSubmit={handleAddPos}
                  className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-3 mb-4"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Title *">
                      <Input
                        value={newPos.title}
                        onChange={(e) =>
                          setNewPos((p) => ({ ...p, title: e.target.value }))
                        }
                        required
                        className="h-8 border-slate-200 text-sm"
                      />
                    </Field>
                    <Field label="Code">
                      <Input
                        value={newPos.code}
                        onChange={(e) =>
                          setNewPos((p) => ({ ...p, code: e.target.value }))
                        }
                        className="h-8 border-slate-200 text-sm"
                      />
                    </Field>
                    <Field label="Department">
                      <Select
                        value={newPos.departmentId || "NONE"}
                        onValueChange={(v) =>
                          setNewPos((p) => ({
                            ...p,
                            departmentId: v === "NONE" ? "" : v,
                          }))
                        }
                      >
                        <SelectTrigger className="h-8 border-slate-200 text-sm">
                          <SelectValue placeholder="No department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">No department</SelectItem>
                          {departments.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-slate-200 text-sm h-8"
                      onClick={() => setShowPosForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm h-8"
                    >
                      {loading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        "Add"
                      )}
                    </Button>
                  </div>
                </form>
              )}
              <div className="space-y-2">
                {positions.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-100"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {p.title}{" "}
                        {p.code && (
                          <span className="text-slate-400 text-xs">
                            ({p.code})
                          </span>
                        )}
                      </p>
                      {p.departmentId && (
                        <p className="text-xs text-slate-400">
                          {departments.find((d) => d.id === p.departmentId)
                            ?.name ?? "—"}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">
                      {p._count.employees} employees
                    </span>
                  </div>
                ))}
                {positions.length === 0 && (
                  <p className="text-slate-300 text-sm text-center py-6">
                    No positions yet
                  </p>
                )}
              </div>
            </Section>
          </div>
        )}

        {/* ── Leave Types ── */}
        {tab === "leave" && (
          <Section
            title="Leave Types"
            action={
              <Button
                size="sm"
                variant="outline"
                className="border-slate-200 text-slate-600"
                onClick={() => setShowLTForm(!showLTForm)}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add
              </Button>
            }
          >
            {showLTForm && (
              <form
                onSubmit={handleAddLT}
                className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-3 mb-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Name *">
                    <Input
                      value={newLT.name}
                      onChange={(e) =>
                        setNewLT((p) => ({ ...p, name: e.target.value }))
                      }
                      required
                      className="h-8 border-slate-200 text-sm"
                    />
                  </Field>
                  <Field label="Category">
                    <Select
                      value={newLT.category}
                      onValueChange={(v) =>
                        setNewLT((p) => ({ ...p, category: v }))
                      }
                    >
                      <SelectTrigger className="h-8 border-slate-200 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEAVE_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c.replace("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Days Allowed *">
                    <Input
                      type="number"
                      min="1"
                      value={newLT.daysAllowed}
                      onChange={(e) =>
                        setNewLT((p) => ({ ...p, daysAllowed: e.target.value }))
                      }
                      required
                      className="h-8 border-slate-200 text-sm"
                    />
                  </Field>
                  <Field label="Color">
                    <div className="flex gap-2 flex-wrap">
                      {LEAVE_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewLT((p) => ({ ...p, color: c }))}
                          className={cn(
                            "w-6 h-6 rounded-full border-2 transition-transform",
                            newLT.color === c
                              ? "border-slate-800 scale-125"
                              : "border-transparent hover:scale-110",
                          )}
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                  </Field>
                </div>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <Switch
                      checked={newLT.isPaid}
                      onCheckedChange={(v) =>
                        setNewLT((p) => ({ ...p, isPaid: v }))
                      }
                    />{" "}
                    Paid
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <Switch
                      checked={newLT.carryForward}
                      onCheckedChange={(v) =>
                        setNewLT((p) => ({ ...p, carryForward: v }))
                      }
                    />{" "}
                    Carry Forward
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-200 text-sm h-8"
                    onClick={() => setShowLTForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm h-8"
                  >
                    {loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "Add Leave Type"
                    )}
                  </Button>
                </div>
              </form>
            )}
            <div className="space-y-2">
              {leaveTypes.map((lt) => (
                <div
                  key={lt.id}
                  className="flex items-center justify-between p-3.5 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ background: lt.color || "#94a3b8" }}
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {lt.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {lt.daysAllowed} days · {lt.category.replace("_", " ")}{" "}
                        · {lt.isPaid ? "Paid" : "Unpaid"}
                        {lt.carryForward ? " · Carry forward" : ""}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={lt.isActive}
                    onCheckedChange={(v) => {
                      toggleLeaveTypeActive(lt.id, v);
                      router.refresh();
                    }}
                  />
                </div>
              ))}
              {leaveTypes.length === 0 && (
                <p className="text-slate-300 text-sm text-center py-8">
                  No leave types configured
                </p>
              )}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-slate-600 text-xs font-semibold uppercase tracking-wide">
        {label}
      </Label>
      {children}
    </div>
  );
}

function SaveBar({
  loading,
  saved,
  error,
  onSave,
}: {
  loading: boolean;
  saved: boolean;
  error: string;
  onSave: () => void;
}) {
  return (
    <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-2">
      <div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && (
          <p className="text-sm text-green-600 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4" /> Saved successfully
          </p>
        )}
      </div>
      <Button
        onClick={onSave}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          "Save Changes"
        )}
      </Button>
    </div>
  );
}
