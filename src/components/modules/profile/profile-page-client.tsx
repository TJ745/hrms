"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateUserProfile,
  updateEmployeeProfile,
  changePassword,
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
import { Loader2, CheckCircle, User, Shield, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";

const TABS = [
  { id: "account", label: "Account", icon: User },
  { id: "personal", label: "Personal", icon: Briefcase },
  { id: "security", label: "Security", icon: Shield },
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
const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ar", label: "Arabic" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "es", label: "Spanish" },
];
const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ORG_ADMIN: "Admin",
  HR_MANAGER: "HR Manager",
  EMPLOYEE: "Employee",
};
const MARITAL_STATUSES = ["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

type Props = {
  user: any;
  employee: any;
  orgSlug: string;
};

export function ProfilePageClient({ user, employee, orgSlug }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("account");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [acct, setAcct] = useState({
    name: user.name || "",
    preferredLanguage: user.preferredLanguage || "en",
    timezone: user.timezone || "UTC",
  });

  const [personal, setPersonal] = useState({
    phone: employee?.phone || "",
    personalEmail: employee?.personalEmail || "",
    address: employee?.address || "",
    city: employee?.city || "",
    country: employee?.country || "",
    linkedinUrl: employee?.linkedinUrl || "",
    nationality: employee?.nationality || "",
    maritalStatus: employee?.maritalStatus || "",
    dateOfBirth: employee?.dateOfBirth
      ? new Date(employee.dateOfBirth).toISOString().split("T")[0]
      : "",
    bloodGroup: employee?.bloodGroup || "",
  });

  const [security, setSecurity] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  async function saveAccount() {
    setLoading(true);
    setError("");
    setSaved(false);
    await updateUserProfile({ userId: user.id, ...acct });
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    router.refresh();
  }

  async function savePersonal() {
    if (!employee) return;
    setLoading(true);
    setError("");
    setSaved(false);
    await updateEmployeeProfile({
      employeeId: employee.id,
      organizationId: user.id,
      ...personal,
    });
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    router.refresh();
  }

  async function savePassword() {
    setError("");
    if (security.newPassword !== security.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (security.newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    const res = await changePassword({
      userId: user.id,
      currentPassword: security.currentPassword,
      newPassword: security.newPassword,
    });
    setLoading(false);
    if (!res.success) {
      setError(res.error || "Failed to change password");
      return;
    }
    setSaved(true);
    setSecurity({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="flex gap-5">
      {/* Tab nav */}
      <div className="w-40 shrink-0">
        {/* Avatar */}
        <div className="mb-5 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-2xl mb-2">
            {user.name
              .split(" ")
              .map((n: string) => n[0])
              .slice(0, 2)
              .join("")}
          </div>
          <p className="text-xs font-semibold text-slate-700 text-center">
            {user.name}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {ROLE_LABELS[user.systemRole] ?? user.systemRole}
          </p>
        </div>

        <nav className="space-y-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setSaved(false);
                setError("");
              }}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                tab === t.id
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100",
              )}
            >
              <t.icon className="w-4 h-4 shrink-0" />
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 bg-white rounded-xl border border-slate-200 p-6">
        {/* ── Account ── */}
        {tab === "account" && (
          <div className="space-y-5">
            <h2 className="font-semibold text-slate-900">
              Account Information
            </h2>

            {/* Read-only info */}
            <div className="bg-slate-50 rounded-lg p-4 space-y-3 text-sm">
              <Row label="Email" value={user.email} />
              <Row
                label="Role"
                value={ROLE_LABELS[user.systemRole] ?? user.systemRole}
              />
              {employee && (
                <Row label="Employee ID" value={employee.employeeCode} />
              )}
              {employee && (
                <Row label="Joined" value={formatDate(employee.hireDate)} />
              )}
              {employee?.branch && (
                <Row label="Branch" value={employee.branch.name} />
              )}
              {employee?.department && (
                <Row label="Department" value={employee.department.name} />
              )}
              {employee?.position && (
                <Row label="Position" value={employee.position.title} />
              )}
              {employee?.status && (
                <Row label="Status" value={employee.status.replace("_", " ")} />
              )}
            </div>

            <div className="space-y-4">
              <Field label="Display Name">
                <Input
                  value={acct.name}
                  onChange={(e) =>
                    setAcct((p) => ({ ...p, name: e.target.value }))
                  }
                  className="border-slate-200"
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Language">
                  <Select
                    value={acct.preferredLanguage}
                    onValueChange={(v) =>
                      setAcct((p) => ({ ...p, preferredLanguage: v }))
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
                <Field label="Timezone">
                  <Select
                    value={acct.timezone || "UTC"}
                    onValueChange={(v) =>
                      setAcct((p) => ({ ...p, timezone: v }))
                    }
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
              </div>
            </div>

            <SaveBar
              loading={loading}
              saved={saved}
              error={error}
              onSave={saveAccount}
            />
          </div>
        )}

        {/* ── Personal ── */}
        {tab === "personal" && (
          <div className="space-y-5">
            <h2 className="font-semibold text-slate-900">Personal Details</h2>
            {!employee ? (
              <p className="text-slate-400 text-sm">
                No employee record linked to your account.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Phone">
                    <Input
                      value={personal.phone}
                      onChange={(e) =>
                        setPersonal((p) => ({ ...p, phone: e.target.value }))
                      }
                      className="border-slate-200"
                    />
                  </Field>
                  <Field label="Personal Email">
                    <Input
                      type="email"
                      value={personal.personalEmail}
                      onChange={(e) =>
                        setPersonal((p) => ({
                          ...p,
                          personalEmail: e.target.value,
                        }))
                      }
                      className="border-slate-200"
                    />
                  </Field>
                  <Field label="Date of Birth">
                    <Input
                      type="date"
                      value={personal.dateOfBirth}
                      onChange={(e) =>
                        setPersonal((p) => ({
                          ...p,
                          dateOfBirth: e.target.value,
                        }))
                      }
                      className="border-slate-200"
                    />
                  </Field>
                  <Field label="Marital Status">
                    <Select
                      value={personal.maritalStatus || "NONE"}
                      onValueChange={(v) =>
                        setPersonal((p) => ({
                          ...p,
                          maritalStatus: v === "NONE" ? "" : v,
                        }))
                      }
                    >
                      <SelectTrigger className="border-slate-200">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">Not specified</SelectItem>
                        {MARITAL_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s.charAt(0) + s.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Nationality">
                    <Input
                      value={personal.nationality}
                      onChange={(e) =>
                        setPersonal((p) => ({
                          ...p,
                          nationality: e.target.value,
                        }))
                      }
                      className="border-slate-200"
                    />
                  </Field>
                  <Field label="Blood Group">
                    <Select
                      value={personal.bloodGroup || "NONE"}
                      onValueChange={(v) =>
                        setPersonal((p) => ({
                          ...p,
                          bloodGroup: v === "NONE" ? "" : v,
                        }))
                      }
                    >
                      <SelectTrigger className="border-slate-200">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">Not specified</SelectItem>
                        {BLOOD_GROUPS.map((b) => (
                          <SelectItem key={b} value={b}>
                            {b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Address">
                    <Input
                      value={personal.address}
                      onChange={(e) =>
                        setPersonal((p) => ({ ...p, address: e.target.value }))
                      }
                      className="border-slate-200"
                    />
                  </Field>
                  <Field label="City">
                    <Input
                      value={personal.city}
                      onChange={(e) =>
                        setPersonal((p) => ({ ...p, city: e.target.value }))
                      }
                      className="border-slate-200"
                    />
                  </Field>
                  <Field label="Country">
                    <Input
                      value={personal.country}
                      onChange={(e) =>
                        setPersonal((p) => ({ ...p, country: e.target.value }))
                      }
                      className="border-slate-200"
                    />
                  </Field>
                  <Field label="LinkedIn URL">
                    <Input
                      value={personal.linkedinUrl}
                      onChange={(e) =>
                        setPersonal((p) => ({
                          ...p,
                          linkedinUrl: e.target.value,
                        }))
                      }
                      placeholder="https://linkedin.com/in/..."
                      className="border-slate-200"
                    />
                  </Field>
                </div>
                <SaveBar
                  loading={loading}
                  saved={saved}
                  error={error}
                  onSave={savePersonal}
                />
              </>
            )}
          </div>
        )}

        {/* ── Security ── */}
        {tab === "security" && (
          <div className="space-y-5">
            <h2 className="font-semibold text-slate-900">Change Password</h2>
            <div className="space-y-4 max-w-sm">
              <Field label="Current Password">
                <Input
                  type="password"
                  value={security.currentPassword}
                  onChange={(e) =>
                    setSecurity((p) => ({
                      ...p,
                      currentPassword: e.target.value,
                    }))
                  }
                  className="border-slate-200"
                  autoComplete="current-password"
                />
              </Field>
              <Field label="New Password">
                <Input
                  type="password"
                  value={security.newPassword}
                  onChange={(e) =>
                    setSecurity((p) => ({ ...p, newPassword: e.target.value }))
                  }
                  className="border-slate-200"
                  autoComplete="new-password"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Minimum 8 characters
                </p>
              </Field>
              <Field label="Confirm New Password">
                <Input
                  type="password"
                  value={security.confirmPassword}
                  onChange={(e) =>
                    setSecurity((p) => ({
                      ...p,
                      confirmPassword: e.target.value,
                    }))
                  }
                  className="border-slate-200"
                  autoComplete="new-password"
                />
              </Field>
            </div>
            <SaveBar
              loading={loading}
              saved={saved}
              error={error}
              onSave={savePassword}
              saveLabel="Update Password"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-slate-700 capitalize">{value}</span>
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
  saveLabel = "Save Changes",
}: {
  loading: boolean;
  saved: boolean;
  error: string;
  onSave: () => void;
  saveLabel?: string;
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
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : saveLabel}
      </Button>
    </div>
  );
}
