"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEmployee } from "@/actions/employee.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Check, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Personal", "Employment", "Account"] as const;

type Options = {
  branches:      { id: string; name: string }[];
  departments:   { id: string; name: string; branchId: string | null }[];
  positions:     { id: string; title: string; departmentId: string | null }[];
  workSchedules: { id: string; name: string }[];
  employees:     { id: string; firstName: string; lastName: string }[];
};

type FormData = {
  // Personal
  firstName: string; lastName: string; middleName: string;
  dateOfBirth: string; gender: string; maritalStatus: string;
  bloodGroup: string; nationality: string; nationalId: string;
  phone: string; personalEmail: string;
  address: string; city: string; country: string;
  // Employment
  branchId: string; departmentId: string; positionId: string;
  managerId: string; workScheduleId: string;
  hireDate: string; probationEndDate: string;
  employmentType: string; noticePeriod: string;
  // Account
  email: string; password: string; confirmPassword: string;
};

const INITIAL: FormData = {
  firstName: "", lastName: "", middleName: "",
  dateOfBirth: "", gender: "", maritalStatus: "",
  bloodGroup: "", nationality: "", nationalId: "",
  phone: "", personalEmail: "",
  address: "", city: "", country: "",
  branchId: "", departmentId: "", positionId: "",
  managerId: "", workScheduleId: "",
  hireDate: "", probationEndDate: "",
  employmentType: "FULL_TIME", noticePeriod: "",
  email: "", password: "", confirmPassword: "",
};

export function AddEmployeeForm({ options, orgSlug }: { options: Options; orgSlug: string }) {
  const router  = useRouter();
  const [step, setStep]     = useState(0);
  const [form, setForm]     = useState<FormData>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  function set(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function nextStep(e: React.FormEvent) {
    e.preventDefault();
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    const result = await createEmployee({
      firstName:       form.firstName,
      lastName:        form.lastName,
      middleName:      form.middleName   || undefined,
      dateOfBirth:     form.dateOfBirth  || undefined,
      gender:          (form.gender as any)       || undefined,
      maritalStatus:   (form.maritalStatus as any) || undefined,
      bloodGroup:      form.bloodGroup   || undefined,
      nationality:     form.nationality  || undefined,
      nationalId:      form.nationalId   || undefined,
      phone:           form.phone        || undefined,
      personalEmail:   form.personalEmail || undefined,
      address:         form.address      || undefined,
      city:            form.city         || undefined,
      country:         form.country      || undefined,
      branchId:        form.branchId,
      departmentId:    form.departmentId || undefined,
      positionId:      form.positionId   || undefined,
      managerId:       form.managerId    || undefined,
      workScheduleId:  form.workScheduleId || undefined,
      hireDate:        form.hireDate,
      probationEndDate: form.probationEndDate || undefined,
      employmentType:  form.employmentType as any,
      noticePeriod:    form.noticePeriod ? parseInt(form.noticePeriod) : undefined,
      email:           form.email,
      password:        form.password,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    router.push(`/${orgSlug}/employees/${result.data.id}`);
  }

  // Filter departments by selected branch
  const filteredDepts = options.departments.filter(
    (d) => !d.branchId || d.branchId === form.branchId
  );
  const filteredPositions = options.positions.filter(
    (p) => !p.departmentId || p.departmentId === form.departmentId
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      {/* Step indicator */}
      <div className="flex items-center gap-0 border-b border-slate-100 px-6 py-4">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
                i < step  ? "bg-blue-600 text-white" :
                i === step ? "bg-blue-600 text-white ring-4 ring-blue-100" :
                "bg-slate-100 text-slate-400"
              )}>
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={cn(
                "text-sm font-medium",
                i === step ? "text-slate-900" : "text-slate-400"
              )}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("h-px w-12 mx-3", i < step ? "bg-blue-300" : "bg-slate-200")} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={step < STEPS.length - 1 ? nextStep : handleSubmit} className="p-6">

        {/* Step 0 — Personal Info */}
        {step === 0 && (
          <div className="space-y-5">
            <h3 className="font-semibold text-slate-800 text-sm mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="First Name *">
                <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} required placeholder="John" />
              </Field>
              <Field label="Middle Name">
                <Input value={form.middleName} onChange={(e) => set("middleName", e.target.value)} placeholder="Optional" />
              </Field>
              <Field label="Last Name *">
                <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} required placeholder="Smith" />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Date of Birth">
                <Input type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
              </Field>
              <Field label="Gender">
                <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Blood Group">
                <Select value={form.bloodGroup} onValueChange={(v) => set("bloodGroup", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((bg) => (
                      <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Phone">
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 234 567 8900" />
              </Field>
              <Field label="Personal Email">
                <Input type="email" value={form.personalEmail} onChange={(e) => set("personalEmail", e.target.value)} placeholder="personal@email.com" />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Nationality">
                <Input value={form.nationality} onChange={(e) => set("nationality", e.target.value)} placeholder="e.g. American" />
              </Field>
              <Field label="National ID">
                <Input value={form.nationalId} onChange={(e) => set("nationalId", e.target.value)} />
              </Field>
              <Field label="Marital Status">
                <Select value={form.maritalStatus} onValueChange={(v) => set("maritalStatus", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SINGLE">Single</SelectItem>
                    <SelectItem value="MARRIED">Married</SelectItem>
                    <SelectItem value="DIVORCED">Divorced</SelectItem>
                    <SelectItem value="WIDOWED">Widowed</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Address" className="sm:col-span-2">
                <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Street address" />
              </Field>
              <Field label="City">
                <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
              </Field>
            </div>
          </div>
        )}

        {/* Step 1 — Employment */}
        {step === 1 && (
          <div className="space-y-5">
            <h3 className="font-semibold text-slate-800 text-sm mb-4">Employment Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Branch *">
                <Select value={form.branchId} onValueChange={(v) => { set("branchId", v); set("departmentId", ""); }}>
                  <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>
                    {options.branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Department">
                <Select value={form.departmentId} onValueChange={(v) => { set("departmentId", v); set("positionId", ""); }} disabled={!form.branchId}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {filteredDepts.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Position">
                <Select value={form.positionId} onValueChange={(v) => set("positionId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
                  <SelectContent>
                    {filteredPositions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Direct Manager">
                <Select value={form.managerId} onValueChange={(v) => set("managerId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                  <SelectContent>
                    {options.employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Hire Date *">
                <Input type="date" value={form.hireDate} onChange={(e) => set("hireDate", e.target.value)} required />
              </Field>
              <Field label="Probation End Date">
                <Input type="date" value={form.probationEndDate} onChange={(e) => set("probationEndDate", e.target.value)} />
              </Field>
              <Field label="Employment Type *">
                <Select value={form.employmentType} onValueChange={(v) => set("employmentType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FULL_TIME">Full Time</SelectItem>
                    <SelectItem value="PART_TIME">Part Time</SelectItem>
                    <SelectItem value="CONTRACT">Contract</SelectItem>
                    <SelectItem value="INTERN">Intern</SelectItem>
                    <SelectItem value="FREELANCE">Freelance</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Work Schedule">
                <Select value={form.workScheduleId} onValueChange={(v) => set("workScheduleId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select schedule" /></SelectTrigger>
                  <SelectContent>
                    {options.workSchedules.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Notice Period (days)">
                <Input type="number" value={form.noticePeriod} onChange={(e) => set("noticePeriod", e.target.value)} placeholder="e.g. 30" />
              </Field>
            </div>
          </div>
        )}

        {/* Step 2 — Account */}
        {step === 2 && (
          <div className="space-y-5">
            <h3 className="font-semibold text-slate-800 text-sm mb-4">Account Credentials</h3>
            <p className="text-sm text-slate-500 -mt-2">
              These credentials will be used by the employee to log in to the system.
            </p>
            <Field label="Work Email *">
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required placeholder="employee@company.com" />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Password *">
                <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} required minLength={8} placeholder="Min 8 characters" />
              </Field>
              <Field label="Confirm Password *">
                <Input type="password" value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)} required placeholder="Repeat password" />
              </Field>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-5 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            className="border-slate-200"
            onClick={() => step > 0 ? setStep(s => s - 1) : router.back()}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {step === 0 ? "Cancel" : "Back"}
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : step < STEPS.length - 1 ? (
              <>Next <ChevronRight className="w-4 h-4 ml-1" /></>
            ) : (
              "Create Employee"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label, children, className,
}: {
  label: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-slate-700 text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}
