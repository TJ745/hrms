"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  requestPlanUpgrade,
  cancelSubscription,
} from "@/actions/billing.actions";
import {
  CreditCard,
  CheckCircle2,
  Building2,
  Users,
  Package,
  FileText,
  AlertTriangle,
  Loader2,
  X,
  Zap,
  Mail,
  ArrowRight,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ── Constants ────────────────────────────────────────────────

const PLAN_STYLES: Record<
  string,
  {
    bg: string;
    text: string;
    border: string;
    badge: string;
    btn: string;
  }
> = {
  FREE: {
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
    badge: "bg-slate-100 text-slate-600",
    btn: "bg-slate-800 hover:bg-slate-900 text-white",
  },
  STARTER: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-300",
    badge: "bg-blue-100 text-blue-700",
    btn: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  PROFESSIONAL: {
    bg: "bg-violet-50",
    text: "text-violet-700",
    border: "border-violet-300",
    badge: "bg-violet-100 text-violet-700",
    btn: "bg-violet-600 hover:bg-violet-700 text-white",
  },
  ENTERPRISE: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-300",
    badge: "bg-amber-100 text-amber-700",
    btn: "bg-amber-600 hover:bg-amber-700 text-white",
  },
};

const INVOICE_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-600",
  VOID: "bg-slate-100 text-slate-500",
};

const PLAN_RANK: Record<string, number> = {
  FREE: 0,
  STARTER: 1,
  PROFESSIONAL: 2,
  ENTERPRISE: 3,
};

// ── Types ────────────────────────────────────────────────────

type BillingPlan = {
  id: string;
  name: string;
  slug: string;
  maxEmployees: number;
  maxBranches: number;
  maxStorageMb: number;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
};

type Subscription = {
  billingCycle: string;
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
} | null;

type Invoice = {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  dueDate: string;
  paidAt: string | null;
};

type Props = {
  organization: { plan: string; name: string } | null;
  subscription: Subscription;
  billingPlans: BillingPlan[];
  invoices: Invoice[];
  employeeCount: number;
  organizationId: string;
  orgSlug: string;
  currentUserName: string;
  currentUserEmail: string;
};

// ── Upgrade Modal ────────────────────────────────────────────

function UpgradeModal({
  plan,
  defaultCycle,
  userName,
  userEmail,
  organizationId,
  onClose,
  onDone,
}: {
  plan: BillingPlan;
  defaultCycle: "MONTHLY" | "YEARLY";
  userName: string;
  userEmail: string;
  organizationId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [cycle, setCycle] = useState<"MONTHLY" | "YEARLY">(defaultCycle);
  const [name, setName] = useState(userName);
  const [email, setEmail] = useState(userEmail);
  const [notes, setNotes] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const key = plan.slug.toUpperCase();
  const s = PLAN_STYLES[key] ?? PLAN_STYLES.FREE;
  const monthly =
    cycle === "YEARLY"
      ? (Number(plan.priceYearly) / 12).toFixed(0)
      : Number(plan.priceMonthly).toFixed(0);
  const saving =
    cycle === "YEARLY" && Number(plan.priceMonthly) > 0
      ? Math.round(
          ((Number(plan.priceMonthly) * 12 - Number(plan.priceYearly)) /
            (Number(plan.priceMonthly) * 12)) *
            100,
        )
      : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await requestPlanUpgrade({
      organizationId,
      targetPlan: key,
      billingCycle: cycle,
      contactName: name,
      contactEmail: email,
      notes: notes || undefined,
    });
    setLoading(false);
    if (res.success) {
      setSent(true);
      setTimeout(onDone, 3000);
    } else setError(res.error ?? "Something went wrong.");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div
          className={cn("px-6 py-5 flex items-center justify-between", s.bg)}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                s.badge,
              )}
            >
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Upgrade to
              </p>
              <h2 className={cn("text-lg font-bold", s.text)}>{plan.name}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/10 transition-colors"
          >
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {sent ? (
          <div className="px-6 py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Request Sent!
            </h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">
              We&apos;ve sent a confirmation to <strong>{email}</strong>. Our
              team will follow up within 1 business day.
            </p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Billing cycle */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                  Billing Cycle
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(["MONTHLY", "YEARLY"] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCycle(c)}
                      className={cn(
                        "p-3 rounded-xl border-2 text-left transition-all",
                        cycle === c
                          ? `${s.border} ${s.bg}`
                          : "border-slate-200 hover:border-slate-300",
                      )}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            cycle === c ? s.text : "text-slate-700",
                          )}
                        >
                          {c === "MONTHLY" ? "Monthly" : "Annual"}
                        </span>
                        {c === "YEARLY" && saving > 0 && (
                          <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                            Save {saving}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        {c === "MONTHLY"
                          ? `$${Number(plan.priceMonthly).toFixed(0)}/mo`
                          : `$${monthly}/mo · $${Number(plan.priceYearly).toFixed(0)}/yr total`}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Plan summary */}
              <div className={cn("rounded-xl p-4", s.bg)}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-700">
                    {plan.name} Plan
                  </span>
                  <span
                    className={cn("text-xl font-bold tabular-nums", s.text)}
                  >
                    ${monthly}
                    <span className="text-xs font-normal text-slate-400">
                      /mo
                    </span>
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> {plan.maxEmployees} employees
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> {plan.maxBranches}{" "}
                    branches
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="w-3 h-3" /> {plan.maxStorageMb / 1024}GB
                  </span>
                </div>
                {plan.features.slice(0, 4).map((f) => (
                  <div key={f} className="flex items-center gap-1.5 mb-1">
                    <Check className="w-3 h-3 text-green-500 shrink-0" />
                    <span className="text-xs text-slate-600">{f}</span>
                  </div>
                ))}
              </div>

              {/* Contact */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Your Contact Details
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">
                      Full Name *
                    </Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="border-slate-200 h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Email *</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="border-slate-200 h-9 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">
                    Notes (optional)
                  </Label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Questions or special requirements..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                <Mail className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  We&apos;ll email you a confirmation and follow up within 1
                  business day to process payment and activate your new plan.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-slate-200"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className={cn("flex-1 gap-2", s.btn)}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Request Upgrade <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Cancel Modal ─────────────────────────────────────────────

function CancelModal({
  organizationId,
  periodEnd,
  onClose,
}: {
  organizationId: string;
  periodEnd: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function confirm() {
    setLoading(true);
    await cancelSubscription(organizationId);
    setLoading(false);
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Cancel Subscription?
          </h2>
        </div>
        <p className="text-sm text-slate-600 mb-2">
          Your plan stays active until{" "}
          <strong>
            {new Date(periodEnd).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </strong>
          , then reverts to Free.
        </p>
        <p className="text-sm text-slate-400 mb-6">
          You won&apos;t be charged again and can re-subscribe at any time.
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 border-slate-200"
            onClick={onClose}
          >
            Keep Plan
          </Button>
          <Button
            onClick={confirm}
            disabled={loading}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Yes, Cancel"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────

export function BillingClient({
  organization,
  subscription,
  billingPlans,
  invoices,
  employeeCount,
  organizationId,
  currentUserName,
  currentUserEmail,
}: Props) {
  const router = useRouter();
  const [upgradingPlan, setUpgradingPlan] = useState<BillingPlan | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">(
    (subscription?.billingCycle as "MONTHLY" | "YEARLY") ?? "MONTHLY",
  );

  const currentPlan = organization?.plan ?? "FREE";
  const currentStyles = PLAN_STYLES[currentPlan] ?? PLAN_STYLES.FREE;
  const currentDetails = billingPlans.find(
    (p) => p.slug.toUpperCase() === currentPlan,
  );
  const usagePct = currentDetails
    ? Math.min(
        100,
        Math.round((employeeCount / currentDetails.maxEmployees) * 100),
      )
    : 0;
  const currentRank = PLAN_RANK[currentPlan] ?? 0;

  return (
    <>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Billing & Plan</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage your subscription, upgrade your plan, and view invoices
          </p>
        </div>

        {/* Current plan card */}
        <div
          className={cn(
            "rounded-xl border-2 p-6",
            currentStyles.border,
            currentStyles.bg,
          )}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span
                  className={cn(
                    "text-xs font-bold px-2.5 py-1 rounded-full",
                    currentStyles.badge,
                  )}
                >
                  CURRENT PLAN
                </span>
                {subscription && (
                  <span className="text-xs text-slate-500 bg-white/60 px-2.5 py-1 rounded-full">
                    {subscription.billingCycle === "YEARLY"
                      ? "Annual"
                      : "Monthly"}{" "}
                    billing
                  </span>
                )}
                {subscription?.cancelAtPeriodEnd && (
                  <span className="text-xs font-semibold bg-red-100 text-red-600 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Cancels{" "}
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" },
                    )}
                  </span>
                )}
              </div>
              <h2 className={cn("text-3xl font-bold mt-1", currentStyles.text)}>
                {currentPlan}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {subscription
                  ? `Renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                  : "Free plan — no payment required"}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {currentDetails && (
                <p
                  className={cn(
                    "text-3xl font-bold tabular-nums",
                    currentStyles.text,
                  )}
                >
                  ${Number(currentDetails.priceMonthly).toFixed(0)}
                  <span className="text-sm font-normal text-slate-400">
                    /mo
                  </span>
                </p>
              )}
              {subscription && !subscription.cancelAtPeriodEnd && (
                <button
                  onClick={() => setShowCancel(true)}
                  className="text-xs text-slate-400 hover:text-red-500 underline transition-colors"
                >
                  Cancel subscription
                </button>
              )}
            </div>
          </div>

          {currentDetails && (
            <div className="mt-5 pt-5 border-t border-white/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
                Usage
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    icon: Users,
                    label: "Employees",
                    used: employeeCount,
                    max: currentDetails.maxEmployees,
                    bar: true,
                  },
                  {
                    icon: Building2,
                    label: "Branches",
                    used: null,
                    max: `${currentDetails.maxBranches}`,
                    bar: false,
                  },
                  {
                    icon: Package,
                    label: "Storage",
                    used: null,
                    max: `${currentDetails.maxStorageMb / 1024}GB`,
                    bar: false,
                  },
                ].map((item) => (
                  <div key={item.label} className="bg-white/60 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <item.icon className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-xs text-slate-500">
                        {item.label}
                      </span>
                    </div>
                    {item.bar && item.used !== null ? (
                      <>
                        <p className="text-sm font-bold text-slate-800">
                          {item.used}
                          <span className="text-slate-400 font-normal text-xs">
                            {" "}
                            / {item.max}
                          </span>
                        </p>
                        <div className="mt-1.5 w-full bg-white rounded-full h-1.5">
                          <div
                            className={cn(
                              "h-1.5 rounded-full transition-all",
                              usagePct > 90
                                ? "bg-red-500"
                                : usagePct > 70
                                  ? "bg-orange-400"
                                  : "bg-blue-500",
                            )}
                            style={{ width: `${usagePct}%` }}
                          />
                        </div>
                        {usagePct > 80 && (
                          <p className="text-[10px] text-orange-600 mt-1 font-semibold">
                            Approaching limit
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm font-bold text-slate-800">
                        Up to {item.max}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Plan picker */}
        {billingPlans.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800">
                {currentPlan === "FREE" ? "Choose a Plan" : "Change Plan"}
              </h2>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {(["MONTHLY", "YEARLY"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setBillingCycle(c)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
                      billingCycle === c
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700",
                    )}
                  >
                    {c === "MONTHLY" ? "Monthly" : "Annual"}
                    {c === "YEARLY" && (
                      <span className="text-[9px] font-bold bg-green-100 text-green-700 px-1 py-0.5 rounded-full">
                        SAVE
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {billingPlans.map((plan) => {
                const key = plan.slug.toUpperCase();
                const isCurrent = key === currentPlan;
                const ps = PLAN_STYLES[key] ?? PLAN_STYLES.FREE;
                const rank = PLAN_RANK[key] ?? 0;
                const isUpgrade = rank > currentRank;
                const price =
                  billingCycle === "YEARLY"
                    ? (Number(plan.priceYearly) / 12).toFixed(0)
                    : Number(plan.priceMonthly).toFixed(0);
                const saving =
                  billingCycle === "YEARLY" && Number(plan.priceMonthly) > 0
                    ? Math.round(
                        ((Number(plan.priceMonthly) * 12 -
                          Number(plan.priceYearly)) /
                          (Number(plan.priceMonthly) * 12)) *
                          100,
                      )
                    : 0;

                return (
                  <div
                    key={plan.id}
                    className={cn(
                      "rounded-xl border-2 p-4 flex flex-col transition-all",
                      isCurrent
                        ? `${ps.border} ${ps.bg}`
                        : "border-slate-200 bg-white hover:border-slate-300",
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={cn(
                          "text-xs font-bold px-2 py-0.5 rounded-full",
                          ps.badge,
                        )}
                      >
                        {plan.name.toUpperCase()}
                      </span>
                      {isCurrent ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : billingCycle === "YEARLY" && saving > 0 ? (
                        <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                          {saving}% off
                        </span>
                      ) : null}
                    </div>

                    <div className="mb-3">
                      <p className="text-2xl font-bold text-slate-900">
                        ${price}
                        <span className="text-xs font-normal text-slate-400">
                          /mo
                        </span>
                      </p>
                      {billingCycle === "YEARLY" &&
                        Number(plan.priceYearly) > 0 && (
                          <p className="text-[11px] text-slate-400">
                            billed ${Number(plan.priceYearly).toFixed(0)}/yr
                          </p>
                        )}
                    </div>

                    <div className="space-y-1.5 flex-1 mb-4 text-xs text-slate-500">
                      <p className="flex items-center gap-1.5">
                        <Users className="w-3 h-3 shrink-0" />
                        {plan.maxEmployees} employees
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Building2 className="w-3 h-3 shrink-0" />
                        {plan.maxBranches} branches
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Package className="w-3 h-3 shrink-0" />
                        {plan.maxStorageMb / 1024}GB storage
                      </p>
                      {plan.features.slice(0, 3).map((f) => (
                        <div key={f} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      disabled={isCurrent}
                      onClick={() => !isCurrent && setUpgradingPlan(plan)}
                      className={cn(
                        "w-full py-2 rounded-lg text-xs font-semibold transition-all",
                        isCurrent
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : isUpgrade
                            ? ps.btn
                            : "bg-slate-100 hover:bg-slate-200 text-slate-600",
                      )}
                    >
                      {isCurrent
                        ? "Current Plan"
                        : isUpgrade
                          ? `Upgrade to ${plan.name} →`
                          : `Downgrade to ${plan.name}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Invoices */}
        <div>
          <h2 className="text-base font-bold text-slate-800 mb-3">
            Invoice History
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {invoices.length === 0 ? (
              <div className="py-12 text-center">
                <CreditCard className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No invoices yet</p>
                <p className="text-slate-300 text-xs mt-1">
                  Invoices appear once you upgrade to a paid plan
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-5 px-5 py-2.5 bg-slate-50 border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <span>Invoice</span>
                  <span>Amount</span>
                  <span>Status</span>
                  <span>Due</span>
                  <span>Paid</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="grid grid-cols-5 px-5 py-3.5 items-center hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-300 shrink-0" />
                        <span className="font-mono text-xs text-slate-600">
                          {inv.invoiceNumber}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-slate-800">
                        {Number(inv.amount).toLocaleString()} {inv.currency}
                      </span>
                      <span>
                        <span
                          className={cn(
                            "text-xs font-semibold px-2 py-0.5 rounded-full",
                            INVOICE_STYLES[inv.status] ??
                              "bg-slate-100 text-slate-500",
                          )}
                        >
                          {inv.status}
                        </span>
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(inv.dueDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span className="text-xs text-slate-500">
                        {inv.paidAt
                          ? new Date(inv.paidAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {upgradingPlan && (
        <UpgradeModal
          plan={upgradingPlan}
          defaultCycle={billingCycle}
          userName={currentUserName}
          userEmail={currentUserEmail}
          organizationId={organizationId}
          onClose={() => setUpgradingPlan(null)}
          onDone={() => {
            setUpgradingPlan(null);
            router.refresh();
          }}
        />
      )}

      {showCancel && subscription && (
        <CancelModal
          organizationId={organizationId}
          periodEnd={subscription.currentPeriodEnd}
          onClose={() => setShowCancel(false)}
        />
      )}
    </>
  );
}
