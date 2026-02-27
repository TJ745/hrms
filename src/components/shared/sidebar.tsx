"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SystemRole } from "@prisma/client";
import {
  LayoutDashboard,
  Users,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  Briefcase,
  TrendingUp,
  Bell,
  Megaphone,
  BarChart3,
  Settings,
  ChevronDown,
  Shield,
} from "lucide-react";
import { useState } from "react";

type NavItem = {
  title: string;
  href: string;
  icon: React.ElementType;
  roles?: SystemRole[];
  badge?: number;
  children?: { title: string; href: string; roles?: SystemRole[] }[];
};

const NAV: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Employees",
    href: "/employees",
    icon: Users,
    children: [
      { title: "All Employees", href: "/employees" },
      { title: "Add Employee", href: "/employees/new" },
      { title: "Departments", href: "/departments" },
      { title: "Positions", href: "/positions" },
    ],
  },
  {
    title: "Attendance",
    href: "/attendance",
    icon: Clock,
  },
  {
    title: "Leave",
    href: "/leave",
    icon: Calendar,
    children: [
      { title: "Requests", href: "/leave/requests" },
      { title: "Leave Types", href: "/leave/types" },
      { title: "Calendar", href: "/leave/calendar" },
    ],
  },
  {
    title: "Payroll",
    href: "/payroll",
    icon: DollarSign,
    roles: ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"],
    children: [
      { title: "Process Payroll", href: "/payroll" },
      { title: "Payslips", href: "/payroll/payslips" },
      {
        title: "Settings",
        href: "/payroll/settings",
      },
    ],
  },

  {
    title: "My Payslips",
    href: "/payroll/payslips",
    icon: DollarSign,
    roles: ["EMPLOYEE"],
  },
  {
    title: "Recruitment",
    href: "/recruitment",
    icon: Briefcase,
    roles: ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"],
    children: [
      { title: "Job Postings", href: "/recruitment/jobs" },
      { title: "Applications", href: "/recruitment/applicants" },
    ],
  },
  {
    title: "Performance",
    href: "/performance",
    icon: TrendingUp,
    children: [
      { title: "Reviews", href: "/performance/reviews" },
      { title: "Goals", href: "/performance/goals" },
    ],
  },
  {
    title: "Announcements",
    href: "/announcements",
    icon: Megaphone,
  },
  {
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["SUPER_ADMIN", "ORG_ADMIN"],
    children: [
      { title: "Organization", href: "/settings/organization" },
      { title: "Branches", href: "/settings/branches" },
      { title: "Roles", href: "/settings/roles" },
      { title: "Billing", href: "/settings/billing" },
    ],
  },
];

const PLAN_BADGE: Record<string, { label: string; color: string }> = {
  FREE: { label: "Free", color: "bg-slate-100 text-slate-500" },
  STARTER: { label: "Starter", color: "bg-blue-50 text-blue-600" },
  PROFESSIONAL: { label: "Pro", color: "bg-violet-50 text-violet-600" },
  ENTERPRISE: { label: "Enterprise", color: "bg-amber-50 text-amber-600" },
};

type SidebarProps = {
  orgSlug: string;
  orgName: string;
  orgPlan: string;
  userRole: SystemRole;
};

export function Sidebar({ orgSlug, orgName, orgPlan, userRole }: SidebarProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<string | null>(null);
  const base = `/${orgSlug}`;

  const planBadge = PLAN_BADGE[orgPlan] ?? PLAN_BADGE.FREE;

  function isActive(href: string) {
    return (
      pathname === `${base}${href}` ||
      (href !== "/dashboard" && pathname.startsWith(`${base}${href}`))
    );
  }

  return (
    <aside className="w-64 h-full bg-white border-r border-slate-200 flex flex-col shrink-0">
      {/* Org Header */}
      <div className="px-4 py-4 border-b border-slate-100">
        <Link
          href={`${base}/dashboard`}
          className="flex items-center gap-3 group"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-200 shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="9" cy="7" r="4" stroke="white" strokeWidth="2" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 text-sm truncate group-hover:text-blue-600 transition-colors">
              {orgName}
            </p>
            <span
              className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                planBadge.color,
              )}
            >
              {planBadge.label}
            </span>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {NAV.filter((item) => !item.roles || item.roles.includes(userRole)).map(
          (item) => {
            const active = isActive(item.href);
            const open = expanded === item.title;
            const Icon = item.icon;

            if (item.children) {
              return (
                <div key={item.title}>
                  <button
                    onClick={() => setExpanded(open ? null : item.title)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                      active
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1 text-left">{item.title}</span>
                    <ChevronDown
                      className={cn(
                        "w-3.5 h-3.5 transition-transform",
                        open && "rotate-180",
                      )}
                    />
                  </button>
                  {open && (
                    <div className="ml-9 mt-0.5 space-y-0.5">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={`${base}${child.href}`}
                          className={cn(
                            "block px-3 py-1.5 rounded-lg text-sm transition-all",
                            pathname === `${base}${child.href}`
                              ? "text-blue-700 font-medium bg-blue-50"
                              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50",
                          )}
                        >
                          {child.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.title}
                href={`${base}${item.href}`}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.title}</span>
                {item.badge && (
                  <span className="text-[10px] font-semibold bg-red-500 text-white rounded-full px-1.5 py-0.5 leading-none">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          },
        )}
      </nav>

      {/* Super admin badge */}
      {userRole === "SUPER_ADMIN" && (
        <div className="px-4 py-3 border-t border-slate-100">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
            <Shield className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs font-medium text-amber-700">
              Super Admin
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}
