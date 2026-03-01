"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createRole,
  updateRole,
  deleteRole,
  assignRoleToUser,
} from "@/actions/roles.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Shield, Pencil, Trash2, Loader2,
  ChevronDown, ChevronUp, Users, Check, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// All available permissions grouped by module
const PERMISSION_GROUPS: { module: string; perms: { key: string; label: string }[] }[] = [
  {
    module: "Employees",
    perms: [
      { key: "employee.view",       label: "View Employees" },
      { key: "employee.create",     label: "Add Employee" },
      { key: "employee.edit",       label: "Edit Employee" },
      { key: "employee.terminate",  label: "Terminate Employee" },
    ],
  },
  {
    module: "Leave",
    perms: [
      { key: "leave.view",    label: "View Leave Requests" },
      { key: "leave.apply",   label: "Apply for Leave" },
      { key: "leave.approve", label: "Approve / Reject Leave" },
    ],
  },
  {
    module: "Attendance",
    perms: [
      { key: "attendance.view",   label: "View Attendance" },
      { key: "attendance.edit",   label: "Edit Attendance" },
      { key: "attendance.export", label: "Export Attendance" },
    ],
  },
  {
    module: "Payroll",
    perms: [
      { key: "payroll.view",    label: "View Payroll" },
      { key: "payroll.process", label: "Process Payroll" },
      { key: "payroll.approve", label: "Approve Payroll" },
      { key: "payroll.export",  label: "Export Payroll" },
    ],
  },
  {
    module: "Recruitment",
    perms: [
      { key: "recruitment.view",   label: "View Jobs & Applicants" },
      { key: "recruitment.create", label: "Post Jobs" },
      { key: "recruitment.manage", label: "Manage Applications" },
    ],
  },
  {
    module: "Performance",
    perms: [
      { key: "performance.view",   label: "View Reviews" },
      { key: "performance.create", label: "Create Reviews" },
      { key: "performance.manage", label: "Manage All Reviews" },
    ],
  },
  {
    module: "Reports",
    perms: [
      { key: "reports.view",   label: "View Reports" },
      { key: "reports.export", label: "Export Reports" },
    ],
  },
  {
    module: "Settings",
    perms: [
      { key: "settings.view",   label: "View Settings" },
      { key: "settings.edit",   label: "Edit Settings" },
      { key: "settings.billing", label: "Manage Billing" },
    ],
  },
];

type Role = {
  id:          string;
  name:        string;
  description: string | null;
  permissions: string[];
  isSystem:    boolean;
  _count:      { userRoles: number };
};

type UserItem = {
  id:         string;
  name:       string;
  email:      string;
  systemRole: string;
  roleAssignments: { id: string; role: { id: string; name: string } }[];
};

type Props = {
  roles:          Role[];
  users:          UserItem[];
  organizationId: string;
  orgSlug:        string;
};

export function RolesClient({ roles, users, organizationId, orgSlug }: Props) {
  const router = useRouter();
  const [loading,      setLoading]      = useState(false);
  const [tab,          setTab]          = useState<"roles" | "assignments">("roles");
  const [showForm,     setShowForm]     = useState(false);
  const [editingRole,  setEditingRole]  = useState<Role | null>(null);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [deletingId,   setDeletingId]   = useState<string | null>(null);

  // Assignment state
  const [assignUserId, setAssignUserId] = useState("");
  const [assignRoleId, setAssignRoleId] = useState("");

  const [form, setForm] = useState({
    name: "", description: "", permissions: [] as string[],
  });

  function openCreate() {
    setEditingRole(null);
    setForm({ name: "", description: "", permissions: [] });
    setShowForm(true);
  }

  function openEdit(role: Role) {
    setEditingRole(role);
    setForm({ name: role.name, description: role.description ?? "", permissions: [...role.permissions] });
    setShowForm(true);
  }

  function togglePerm(key: string) {
    setForm((p) => ({
      ...p,
      permissions: p.permissions.includes(key)
        ? p.permissions.filter((k) => k !== key)
        : [...p.permissions, key],
    }));
  }

  function toggleModulePerms(perms: { key: string }[]) {
    const keys    = perms.map((p) => p.key);
    const allOn   = keys.every((k) => form.permissions.includes(k));
    setForm((p) => ({
      ...p,
      permissions: allOn
        ? p.permissions.filter((k) => !keys.includes(k))
        : [...new Set([...p.permissions, ...keys])],
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (editingRole) {
      await updateRole({
        roleId:         editingRole.id,
        organizationId,
        name:           form.name,
        description:    form.description || undefined,
        permissions:    form.permissions,
      });
    } else {
      await createRole({
        organizationId,
        name:        form.name,
        description: form.description || undefined,
        permissions: form.permissions,
      });
    }
    setLoading(false);
    setShowForm(false);
    router.refresh();
  }

  async function handleDelete(roleId: string) {
    setLoading(true);
    await deleteRole(roleId, organizationId);
    setLoading(false);
    setDeletingId(null);
    router.refresh();
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!assignUserId || !assignRoleId) return;
    setLoading(true);
    await assignRoleToUser({ userId: assignUserId, roleId: assignRoleId, organizationId });
    setLoading(false);
    setAssignUserId("");
    setAssignRoleId("");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Roles & Permissions</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Define custom roles and control what each role can access
          </p>
        </div>
        {tab === "roles" && (
          <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-1.5" /> New Role
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { key: "roles",       label: `Roles (${roles.length})` },
          { key: "assignments", label: `User Assignments (${users.length})` },
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

      {/* ── CREATE / EDIT FORM ── */}
      {showForm && tab === "roles" && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">
            {editingRole ? `Edit Role: ${editingRole.name}` : "Create New Role"}
          </h3>
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Role Name *
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                  placeholder="e.g. Branch Manager"
                  className="border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Description
                </Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="What does this role do?"
                  className="border-slate-200"
                />
              </div>
            </div>

            {/* Permissions grid */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Permissions ({form.permissions.length} selected)
              </Label>
              <div className="space-y-3">
                {PERMISSION_GROUPS.map((group) => {
                  const allOn = group.perms.every((p) => form.permissions.includes(p.key));
                  const someOn = group.perms.some((p) => form.permissions.includes(p.key));
                  return (
                    <div key={group.module} className="border border-slate-100 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleModulePerms(group.perms)}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors",
                          allOn ? "bg-blue-50" : someOn ? "bg-blue-50/40" : "bg-slate-50"
                        )}
                      >
                        <span className="text-sm font-semibold text-slate-700">{group.module}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">
                            {group.perms.filter((p) => form.permissions.includes(p.key)).length}/{group.perms.length}
                          </span>
                          <div className={cn(
                            "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                            allOn ? "bg-blue-600 border-blue-600" : someOn ? "border-blue-400" : "border-slate-300"
                          )}>
                            {allOn && <Check className="w-2.5 h-2.5 text-white" />}
                            {someOn && !allOn && <div className="w-2 h-0.5 bg-blue-400" />}
                          </div>
                        </div>
                      </button>
                      <div className="grid grid-cols-2 gap-px bg-slate-100 border-t border-slate-100">
                        {group.perms.map((perm) => {
                          const on = form.permissions.includes(perm.key);
                          return (
                            <button
                              key={perm.key}
                              type="button"
                              onClick={() => togglePerm(perm.key)}
                              className={cn(
                                "flex items-center gap-2.5 px-4 py-2 text-left transition-colors",
                                on ? "bg-blue-50 text-blue-700" : "bg-white text-slate-600 hover:bg-slate-50"
                              )}
                            >
                              <div className={cn(
                                "w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                                on ? "bg-blue-600 border-blue-600" : "border-slate-300"
                              )}>
                                {on && <Check className="w-2 h-2 text-white" />}
                              </div>
                              <span className="text-xs font-medium">{perm.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="border-slate-200" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : editingRole ? "Save Changes" : "Create Role"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ── ROLES TAB ── */}
      {tab === "roles" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {roles.length === 0 ? (
            <div className="py-16 text-center">
              <Shield className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No roles yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {roles.map((role) => {
                const isExpanded = expandedRole === role.id;
                return (
                  <div key={role.id}>
                    <div className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                          role.isSystem ? "bg-purple-50" : "bg-blue-50"
                        )}>
                          <Shield className={cn("w-5 h-5", role.isSystem ? "text-purple-500" : "text-blue-500")} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-800">{role.name}</p>
                            {role.isSystem && (
                              <span className="text-[10px] font-semibold bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full">
                                SYSTEM
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">
                            {role.description ?? "No description"} · {role.permissions.length} permissions · {role._count.userRoles} users
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setExpandedRole(isExpanded ? null : role.id)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          {isExpanded
                            ? <ChevronUp className="w-4 h-4 text-slate-400" />
                            : <ChevronDown className="w-4 h-4 text-slate-400" />
                          }
                        </button>
                        {!role.isSystem && (
                          <>
                            <button onClick={() => openEdit(role)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                              <Pencil className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                            {deletingId === role.id ? (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-slate-500">Delete?</span>
                                <button onClick={() => handleDelete(role.id)} disabled={loading} className="p-1 hover:bg-red-50 rounded text-red-500">
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setDeletingId(null)} className="p-1 hover:bg-slate-100 rounded text-slate-400">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setDeletingId(role.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Expanded permissions */}
                    {isExpanded && (
                      <div className="px-5 pb-4 border-t border-slate-50">
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {role.permissions.length === 0 ? (
                            <span className="text-xs text-slate-400">No permissions assigned</span>
                          ) : (
                            role.permissions.map((p) => (
                              <span key={p} className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">
                                {p}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ASSIGNMENTS TAB ── */}
      {tab === "assignments" && (
        <div className="space-y-4">
          {/* Assign form */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Assign Role to User</h3>
            <form onSubmit={handleAssign} className="flex gap-3 items-end">
              <div className="space-y-1.5 flex-1">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">User</Label>
                <Select value={assignUserId} onValueChange={setAssignUserId}>
                  <SelectTrigger className="border-slate-200"><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 flex-1">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</Label>
                <Select value={assignRoleId} onValueChange={setAssignRoleId}>
                  <SelectTrigger className="border-slate-200"><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={loading || !assignUserId || !assignRoleId} className="bg-blue-600 hover:bg-blue-700 text-white">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Assign"}
              </Button>
            </form>
          </div>

          {/* Users list */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="divide-y divide-slate-100">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{u.name}</p>
                      <p className="text-xs text-slate-400">{u.email} · {u.systemRole}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {u.roleAssignments.length === 0 ? (
                      <span className="text-xs text-slate-300">No custom roles</span>
                    ) : (
                      u.roleAssignments.map((ra) => (
                        <span key={ra.id} className="text-xs font-semibold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">
                          {ra.role.name}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
