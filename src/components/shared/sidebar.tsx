"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SystemRole } from "@prisma/client";
import {
  LayoutDashboard,
  Users,
  Clock,
  Calendar,
  DollarSign,
  Briefcase,
  TrendingUp,
  Megaphone,
  BarChart3,
  Settings,
  ChevronDown,
  Shield,
  Receipt,
  FileText,
  CalendarDays,
  Package,
  ArrowRightLeft,
  ClipboardList,
  TicketIcon,
  GraduationCap,
  CalendarRange,
  BookOpen,
  Timer,
  Brain,
  Layers,
  Star,
  BarChart2,
  Bell,
  UserCircle,
} from "lucide-react";
import { useState } from "react";

type NavChild = { title: string; href: string; roles?: SystemRole[] };
type NavItem = {
  title: string;
  href: string;
  icon: React.ElementType;
  roles?: SystemRole[];
  children?: NavChild[];
};
type NavSection = { label: string; items: NavItem[] };

const HR_ROLES: SystemRole[] = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"];
const ADMIN_ROLES: SystemRole[] = ["SUPER_ADMIN", "ORG_ADMIN"];

const NAV_SECTIONS: NavSection[] = [
  {
    label: "",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Notifications", href: "/notifications", icon: Bell },
      { title: "My Profile", href: "/profile", icon: UserCircle },
    ],
  },
  {
    label: "People",
    items: [
      {
        title: "Employees",
        href: "/employees",
        icon: Users,
        roles: HR_ROLES,
        children: [
          { title: "All Employees", href: "/employees" },
          { title: "Add Employee", href: "/employees/new" },
        ],
      },
      { title: "Attendance", href: "/attendance", icon: Clock },
      {
        title: "Leave",
        href: "/leave",
        icon: Calendar,
        children: [
          { title: "Requests", href: "/leave/requests" },
          { title: "Calendar", href: "/leave/calendar" },
        ],
      },
      { title: "Shifts", href: "/shifts", icon: Layers, roles: HR_ROLES },
      { title: "Competencies", href: "/competencies", icon: Brain },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        title: "Payroll",
        href: "/payroll",
        icon: DollarSign,
        roles: HR_ROLES,
        children: [
          { title: "Process Payroll", href: "/payroll" },
          { title: "Payslips", href: "/payroll/payslips" },
        ],
      },
      {
        title: "My Payslips",
        href: "/payroll/payslips",
        icon: DollarSign,
        roles: ["EMPLOYEE"] as SystemRole[],
      },
      { title: "Expenses", href: "/expenses", icon: Receipt },
      { title: "Overtime", href: "/overtime", icon: Timer, roles: HR_ROLES },
      { title: "TOIL", href: "/toil", icon: Star },
    ],
  },
  {
    label: "Talent",
    items: [
      {
        title: "Recruitment",
        href: "/recruitment/jobs",
        icon: Briefcase,
        roles: HR_ROLES,
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
          { title: "Reviews", href: "/performance" },
          { title: "New Review", href: "/performance/new", roles: HR_ROLES },
        ],
      },
      { title: "Training", href: "/training", icon: GraduationCap },
      {
        title: "Onboarding",
        href: "/onboarding",
        icon: ClipboardList,
        roles: HR_ROLES,
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        title: "HR Operations",
        href: "/transfers",
        icon: ArrowRightLeft,
        roles: HR_ROLES,
        children: [
          { title: "Transfers", href: "/transfers" },
          { title: "Resignations", href: "/resignations" },
          { title: "Disciplinary", href: "/disciplinary" },
          { title: "Letters", href: "/letters" },
        ],
      },
      { title: "Assets", href: "/assets", icon: Package, roles: HR_ROLES },
      {
        title: "Contracts",
        href: "/contracts",
        icon: FileText,
        roles: HR_ROLES,
      },
      { title: "Holidays", href: "/holidays", icon: CalendarDays },
    ],
  },
  {
    label: "Engagement",
    items: [
      { title: "Announcements", href: "/announcements", icon: Megaphone },
      { title: "Events", href: "/events", icon: CalendarRange },
      { title: "Surveys", href: "/surveys", icon: BarChart2 },
      { title: "Tickets", href: "/tickets", icon: TicketIcon },
    ],
  },
  {
    label: "Company",
    items: [
      { title: "Documents", href: "/documents", icon: BookOpen },
      { title: "Reports", href: "/reports", icon: BarChart3, roles: HR_ROLES },
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
        roles: ADMIN_ROLES,
        children: [
          { title: "General", href: "/settings" },
          { title: "Roles", href: "/settings/roles" },
          { title: "Billing", href: "/settings/billing" },
        ],
      },
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
  const [expanded, setExpanded] = useState<string | null>(() => {
    // Auto-expand the section containing the active route on first render
    return null;
  });
  const base = `/${orgSlug}`;
  const planBadge = PLAN_BADGE[orgPlan] ?? PLAN_BADGE.FREE;

  function isActive(href: string) {
    const full = `${base}${href}`;
    if (href === "/dashboard") return pathname === full;
    return pathname === full || pathname.startsWith(`${full}/`);
  }

  function isChildActive(href: string) {
    return pathname === `${base}${href}`;
  }

  return (
    <aside className="w-60 h-full bg-white border-r border-slate-200 flex flex-col shrink-0">
      {/* Org header */}
      <div className="px-4 py-4 border-b border-slate-100">
        <Link
          href={`${base}/dashboard`}
          className="flex items-center gap-3 group"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-200 shrink-0">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
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
            <p className="font-semibold text-slate-900 text-sm truncate group-hover:text-blue-600 transition-colors leading-tight">
              {orgName}
            </p>
            <span
              className={cn(
                "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                planBadge.color,
              )}
            >
              {planBadge.label}
            </span>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        {NAV_SECTIONS.map((section, si) => {
          // Filter items by role
          const visibleItems = section.items.filter(
            (item) => !item.roles || item.roles.includes(userRole),
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={si} className={cn(si > 0 && "mt-4")}>
              {section.label && (
                <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 select-none">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const active = isActive(item.href);
                  const open = expanded === item.title;
                  const Icon = item.icon;

                  if (item.children) {
                    const visibleChildren = item.children.filter(
                      (c) => !c.roles || c.roles.includes(userRole),
                    );
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
                              "w-3.5 h-3.5 transition-transform duration-200",
                              open && "rotate-180",
                            )}
                          />
                        </button>
                        {open && (
                          <div className="ml-9 mt-0.5 space-y-0.5">
                            {visibleChildren.map((child) => (
                              <Link
                                key={child.href}
                                href={`${base}${child.href}`}
                                className={cn(
                                  "block px-3 py-1.5 rounded-lg text-[13px] transition-all",
                                  isChildActive(child.href)
                                    ? "text-blue-700 font-semibold bg-blue-50"
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
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Super admin badge */}
      {userRole === "SUPER_ADMIN" && (
        <div className="px-3 py-3 border-t border-slate-100">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
            <Shield className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="text-xs font-semibold text-amber-700">
              Super Admin
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}
