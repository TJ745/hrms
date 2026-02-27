"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, Check } from "lucide-react";
import { slugify } from "@/lib/utils";

const STEPS = ["Account", "Organization"] as const;
type Step = 0 | 1;

export default function RegisterPage() {
  const router  = useRouter();
  const [step, setStep]       = useState<Step>(0);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError]     = useState("");

  const [form, setForm] = useState({
    name:     "",
    email:    "",
    password: "",
    orgName:  "",
    orgSlug:  "",
  });

  function updateField(field: string, value: string) {
    const update: Record<string, string> = { [field]: value };
    if (field === "orgName") update.orgSlug = slugify(value);
    setForm((prev) => ({ ...prev, ...update }));
  }

  function nextStep(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStep(1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await signUp.email({
      name:     form.name,
      email:    form.email,
      password: form.password,
      callbackURL: "/verify-email",
    });

    if (error) {
      setError(error.message ?? "Registration failed");
      setLoading(false);
      return;
    }

    // TODO: create organization via server action after email verification
    // For now, store org info in localStorage temporarily
    if (typeof window !== "undefined") {
      localStorage.setItem("pending_org", JSON.stringify({
        name: form.orgName,
        slug: form.orgSlug,
      }));
    }

    router.push("/verify-email?email=" + encodeURIComponent(form.email));
  }

  const passwordStrength = (() => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8)          s++;
    if (/[A-Z]/.test(p))        s++;
    if (/[0-9]/.test(p))        s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();

  const strengthColors = ["bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-500"];
  const strengthLabels = ["Weak", "Fair", "Good", "Strong"];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="lg:hidden flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="9" cy="7" r="4" stroke="white" strokeWidth="2"/>
            </svg>
          </div>
          <span className="font-semibold text-slate-900">HRMS</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Create your account</h2>
        <p className="text-slate-500 text-sm mt-1">Set up your organization in minutes</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all
              ${i < step ? "bg-blue-600 text-white" :
                i === step ? "bg-blue-600 text-white shadow-md shadow-blue-200" :
                "bg-slate-100 text-slate-400"}`}>
              {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-sm font-medium ${i === step ? "text-slate-900" : "text-slate-400"}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-8 mx-1 ${i < step ? "bg-blue-400" : "bg-slate-200"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0 — Account */}
      {step === 0 && (
        <form onSubmit={nextStep} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-slate-700 text-sm font-medium">Full name</Label>
            <Input
              id="name"
              placeholder="John Smith"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              required
              className="h-11 border-slate-200 bg-white focus-visible:ring-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-slate-700 text-sm font-medium">Work email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              required
              className="h-11 border-slate-200 bg-white focus-visible:ring-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-slate-700 text-sm font-medium">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPass ? "text" : "password"}
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                required
                minLength={8}
                className="h-11 border-slate-200 bg-white focus-visible:ring-blue-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {form.password && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i}
                      className={`h-1 flex-1 rounded-full transition-all duration-300
                        ${i < passwordStrength ? strengthColors[passwordStrength - 1] : "bg-slate-200"}`}
                    />
                  ))}
                </div>
                <p className="text-xs text-slate-500">{strengthLabels[passwordStrength - 1] ?? "Too short"}</p>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium">
            Continue
          </Button>
        </form>
      )}

      {/* Step 1 — Organization */}
      {step === 1 && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="orgName" className="text-slate-700 text-sm font-medium">Organization name</Label>
            <Input
              id="orgName"
              placeholder="Acme Corp"
              value={form.orgName}
              onChange={(e) => updateField("orgName", e.target.value)}
              required
              className="h-11 border-slate-200 bg-white focus-visible:ring-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="orgSlug" className="text-slate-700 text-sm font-medium">
              URL slug
            </Label>
            <div className="flex">
              <div className="flex items-center px-3 h-11 border border-r-0 border-slate-200 rounded-l-md bg-slate-50 text-slate-400 text-sm select-none">
                hrms.com/
              </div>
              <Input
                id="orgSlug"
                placeholder="acme-corp"
                value={form.orgSlug}
                onChange={(e) => updateField("orgSlug", e.target.value)}
                required
                className="h-11 rounded-l-none border-slate-200 bg-white focus-visible:ring-blue-500"
              />
            </div>
            <p className="text-xs text-slate-400">Your team will access the app at this URL</p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(0)}
              className="flex-1 h-11 border-slate-200"
            >
              Back
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create account"}
            </Button>
          </div>
        </form>
      )}

      <p className="text-center text-sm text-slate-500 mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">Sign in</Link>
      </p>
    </div>
  );
}
