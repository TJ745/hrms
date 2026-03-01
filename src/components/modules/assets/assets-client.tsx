"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createAsset,
  assignAsset,
  returnAsset,
  deleteAsset,
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
import {
  Loader2,
  Plus,
  Laptop,
  Smartphone,
  Car,
  Key,
  Package,
  ArrowLeftRight,
  Trash2,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "LAPTOP",
  "PHONE",
  "VEHICLE",
  "KEY",
  "EQUIPMENT",
  "FURNITURE",
  "OTHER",
];
const CONDITIONS = ["NEW", "GOOD", "FAIR", "POOR"];

const CATEGORY_ICONS: Record<string, any> = {
  LAPTOP: Laptop,
  PHONE: Smartphone,
  VEHICLE: Car,
  KEY: Key,
  default: Package,
};

const CONDITION_STYLES: Record<string, string> = {
  NEW: "bg-green-100 text-green-700",
  GOOD: "bg-blue-100 text-blue-700",
  FAIR: "bg-yellow-100 text-yellow-700",
  POOR: "bg-red-100 text-red-600",
};

type Asset = {
  id: string;
  name: string;
  category: string | null;
  serialNumber: string | null;
  brand: string | null;
  model: string | null;
  condition: string | null;
  assignedAt: string | null;
  returnedAt: string | null;
  purchasePrice: number | null;
  employee: {
    id?: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
  } | null;
};

type Props = {
  assets: Asset[];
  employees: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
  }[];
  isHR: boolean;
  organizationId: string;
  orgSlug: string;
};

export function AssetsClient({
  assets,
  employees,
  isHR,
  organizationId,
  orgSlug,
}: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignEmployeeId, setAssignEmployeeId] = useState("");
  const [form, setForm] = useState({
    name: "",
    category: "LAPTOP",
    serialNumber: "",
    brand: "",
    model: "",
    condition: "GOOD",
    purchaseDate: "",
    purchasePrice: "",
    notes: "",
    employeeId: "",
  });

  const filtered =
    filter === "ALL"
      ? assets
      : filter === "ASSIGNED"
        ? assets.filter((a) => a.employee !== null)
        : assets.filter((a) => a.employee === null);

  const stats = {
    total: assets.length,
    assigned: assets.filter((a) => a.employee !== null).length,
    available: assets.filter((a) => a.employee === null).length,
  };

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await createAsset({
      organizationId,
      name: form.name,
      category: form.category,
      serialNumber: form.serialNumber || undefined,
      brand: form.brand || undefined,
      model: form.model || undefined,
      condition: form.condition,
      purchaseDate: form.purchaseDate || undefined,
      purchasePrice: form.purchasePrice
        ? parseFloat(form.purchasePrice)
        : undefined,
      notes: form.notes || undefined,
      employeeId: form.employeeId || undefined,
    });
    setLoading(false);
    setShowForm(false);
    setForm({
      name: "",
      category: "LAPTOP",
      serialNumber: "",
      brand: "",
      model: "",
      condition: "GOOD",
      purchaseDate: "",
      purchasePrice: "",
      notes: "",
      employeeId: "",
    });
    router.refresh();
  }

  async function handleAssign(assetId: string) {
    if (!assignEmployeeId) return;
    setLoading(true);
    await assignAsset({
      assetId,
      employeeId: assignEmployeeId,
      organizationId,
    });
    setLoading(false);
    setAssigningId(null);
    setAssignEmployeeId("");
    router.refresh();
  }

  async function handleReturn(assetId: string) {
    if (!confirm("Mark this asset as returned?")) return;
    setLoading(true);
    await returnAsset({ assetId, organizationId });
    setLoading(false);
    router.refresh();
  }

  async function handleDelete(assetId: string) {
    if (!confirm("Delete this asset?")) return;
    setLoading(true);
    await deleteAsset(assetId);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Asset Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track company assets assigned to employees
          </p>
        </div>
        {isHR && (
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Asset
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Total Assets",
            value: stats.total,
            color: "text-slate-700",
            bg: "bg-slate-50",
          },
          {
            label: "Assigned",
            value: stats.assigned,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "Available",
            value: stats.available,
            color: "text-green-600",
            bg: "bg-green-50",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3"
          >
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                s.bg,
              )}
            >
              <Package className={cn("w-5 h-5", s.color)} />
            </div>
            <div>
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className={cn("text-2xl font-bold tabular-nums", s.color)}>
                {s.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && isHR && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">New Asset</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Asset Name *
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  required
                  placeholder="MacBook Pro 14"
                  className="border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Category
                </Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}
                >
                  <SelectTrigger className="border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Brand
                </Label>
                <Input
                  value={form.brand}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, brand: e.target.value }))
                  }
                  placeholder="Apple"
                  className="border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Model
                </Label>
                <Input
                  value={form.model}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, model: e.target.value }))
                  }
                  placeholder="MBP14-M3"
                  className="border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Serial No.
                </Label>
                <Input
                  value={form.serialNumber}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, serialNumber: e.target.value }))
                  }
                  placeholder="C02XG..."
                  className="border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Condition
                </Label>
                <Select
                  value={form.condition}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, condition: v }))
                  }
                >
                  <SelectTrigger className="border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Purchase Date
                </Label>
                <Input
                  type="date"
                  value={form.purchaseDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, purchaseDate: e.target.value }))
                  }
                  className="border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Purchase Price
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.purchasePrice}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, purchasePrice: e.target.value }))
                  }
                  placeholder="1299.00"
                  className="border-slate-200"
                />
              </div>
              {employees.length > 0 && (
                <div className="space-y-1.5 col-span-3">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Assign to Employee (optional)
                  </Label>
                  <Select
                    value={form.employeeId}
                    onValueChange={(v) =>
                      setForm((p) => ({ ...p, employeeId: v }))
                    }
                  >
                    <SelectTrigger className="border-slate-200">
                      <SelectValue placeholder="Leave unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.firstName} {e.lastName} ({e.employeeCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Save Asset"
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
        {["ALL", "ASSIGNED", "AVAILABLE"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              filter === s
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Assets grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <Package className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No assets found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((asset) => {
            const Icon =
              CATEGORY_ICONS[asset.category ?? "default"] ??
              CATEGORY_ICONS.default;
            return (
              <div
                key={asset.id}
                className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 leading-tight">
                        {asset.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {asset.brand} {asset.model}
                      </p>
                    </div>
                  </div>
                  {asset.condition && (
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0",
                        CONDITION_STYLES[asset.condition] ??
                          "bg-slate-100 text-slate-500",
                      )}
                    >
                      {asset.condition}
                    </span>
                  )}
                </div>

                {asset.serialNumber && (
                  <p className="text-xs text-slate-400 mb-2">
                    S/N: {asset.serialNumber}
                  </p>
                )}

                {asset.employee ? (
                  <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg mb-3">
                    <UserCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="text-xs text-blue-700 font-medium">
                      {asset.employee.firstName} {asset.employee.lastName}
                    </span>
                    <span className="text-xs text-blue-400">
                      ({asset.employee.employeeCode})
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg mb-3">
                    <Package className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    <span className="text-xs text-green-700 font-medium">
                      Available
                    </span>
                  </div>
                )}

                {isHR && (
                  <div className="flex gap-2">
                    {asset.employee ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReturn(asset.id)}
                        disabled={loading}
                        className="flex-1 h-7 text-xs border-slate-200"
                      >
                        <ArrowLeftRight className="w-3 h-3 mr-1" /> Return
                      </Button>
                    ) : assigningId === asset.id ? (
                      <div className="flex-1 flex gap-1">
                        <Select
                          value={assignEmployeeId}
                          onValueChange={setAssignEmployeeId}
                        >
                          <SelectTrigger className="h-7 text-xs border-slate-200 flex-1">
                            <SelectValue placeholder="Pick employee" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map((e) => (
                              <SelectItem key={e.id} value={e.id}>
                                {e.firstName} {e.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          onClick={() => handleAssign(asset.id)}
                          disabled={loading || !assignEmployeeId}
                          className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white px-2"
                        >
                          {loading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            "Assign"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAssigningId(null)}
                          className="h-7 text-xs border-slate-200 px-2"
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAssigningId(asset.id)}
                        className="flex-1 h-7 text-xs border-slate-200"
                      >
                        <UserCheck className="w-3 h-3 mr-1" /> Assign
                      </Button>
                    )}
                    <button
                      onClick={() => handleDelete(asset.id)}
                      className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
