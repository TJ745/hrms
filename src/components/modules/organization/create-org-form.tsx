"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createOrganization } from "@/actions/organization.actions";
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
import { Loader2 } from "lucide-react";
import { slugify } from "@/lib/utils";

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

const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Finance & Banking",
  "Education",
  "Retail & E-commerce",
  "Manufacturing",
  "Construction",
  "Hospitality",
  "Media & Entertainment",
  "Logistics & Transport",
  "Real Estate",
  "Other",
];

export function CreateOrgForm({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    slug: "",
    email: userEmail,
    phone: "",
    country: "",
    timezone: "UTC",
    industry: "",
  });

  function set(field: string, value: string) {
    const update: Record<string, string> = { [field]: value };
    if (field === "name") update.slug = slugify(value);
    setForm((prev) => ({ ...prev, ...update }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await createOrganization({
      name: form.name,
      slug: form.slug,
      email: form.email,
      phone: form.phone || undefined,
      country: form.country || undefined,
      timezone: form.timezone,
      industry: form.industry || undefined,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    // Redirect to dashboard
    router.push(`/${result.data.org.slug}/dashboard`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Org name */}
      <div className="space-y-1.5">
        <Label className="text-slate-700 text-sm font-medium">
          Organization Name *
        </Label>
        <Input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Acme Corporation"
          required
          className="h-10 border-slate-200"
        />
      </div>

      {/* Slug */}
      <div className="space-y-1.5">
        <Label className="text-slate-700 text-sm font-medium">URL Slug *</Label>
        <div className="flex">
          <div className="flex items-center px-3 h-10 border border-r-0 border-slate-200 rounded-l-md bg-slate-50 text-slate-400 text-sm select-none whitespace-nowrap">
            hrms.com/
          </div>
          <Input
            value={form.slug}
            onChange={(e) => set("slug", e.target.value)}
            placeholder="acme-corporation"
            required
            className="h-10 rounded-l-none border-slate-200"
          />
        </div>
        <p className="text-xs text-slate-400">
          Lowercase letters, numbers and hyphens only
        </p>
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label className="text-slate-700 text-sm font-medium">
          Organization Email *
        </Label>
        <Input
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          required
          className="h-10 border-slate-200"
        />
      </div>

      {/* Phone + Country */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-sm font-medium">Phone</Label>
          <Input
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+1 234 567 8900"
            className="h-10 border-slate-200"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-sm font-medium">Country</Label>
          <Input
            value={form.country}
            onChange={(e) => set("country", e.target.value)}
            placeholder="e.g. United States"
            className="h-10 border-slate-200"
          />
        </div>
      </div>

      {/* Timezone + Industry */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-sm font-medium">Timezone</Label>
          <Select
            value={form.timezone}
            onValueChange={(v) => set("timezone", v)}
          >
            <SelectTrigger className="h-10 border-slate-200">
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
        </div>
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-sm font-medium">Industry</Label>
          <Select
            value={form.industry}
            onValueChange={(v) => set("industry", v)}
          >
            <SelectTrigger className="h-10 border-slate-200">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((ind) => (
                <SelectItem key={ind} value={ind}>
                  {ind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* What gets created automatically */}
      <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-500 space-y-1">
        <p className="font-medium text-slate-600 mb-1">
          Created automatically for you:
        </p>
        <p>✓ Headquarters branch</p>
        <p>✓ Standard work schedule (Mon–Fri, 9am–6pm)</p>
        <p>✓ Default leave types (Annual, Sick, Unpaid, Emergency)</p>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          "Create Organization & Continue"
        )}
      </Button>
    </form>
  );
}
