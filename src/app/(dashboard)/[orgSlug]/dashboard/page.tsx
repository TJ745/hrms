// import { headers } from "next/headers";
// import { redirect } from "next/navigation";
// import { auth } from "@/lib/auth";
// import { prisma } from "@/lib/prisma";
// import { formatDate } from "@/lib/utils";
// import {
//   Users, UserCheck, UserX, Clock, CalendarOff,
//   Briefcase, TrendingUp, DollarSign,
// } from "lucide-react";

// async function getDashboardStats(organizationId: string, branchId?: string | null) {
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);

//   const where = {
//     organizationId,
//     ...(branchId ? { branchId } : {}),
//   };

//   const [
//     totalEmployees,
//     activeEmployees,
//     presentToday,
//     absentToday,
//     onLeaveToday,
//     pendingLeaves,
//     openPositions,
//   ] = await Promise.all([
//     prisma.employee.count({ where }),
//     prisma.employee.count({ where: { ...where, status: "ACTIVE" } }),
//     prisma.attendance.count({ where: { employee: { ...where }, date: today, status: "PRESENT" } }),
//     prisma.attendance.count({ where: { employee: { ...where }, date: today, status: "ABSENT" } }),
//     prisma.attendance.count({ where: { employee: { ...where }, date: today, status: "ON_LEAVE" } }),
//     prisma.leaveRequest.count({ where: { employee: { ...where }, status: "PENDING" } }),
//     prisma.jobPosting.count({ where: { organizationId, status: "OPEN" } }),
//   ]);

//   return {
//     totalEmployees, activeEmployees, presentToday,
//     absentToday, onLeaveToday, pendingLeaves, openPositions,
//   };
// }

// const STAT_CARDS = (stats: Awaited<ReturnType<typeof getDashboardStats>>) => [
//   {
//     title:   "Total Employees",
//     value:   stats.totalEmployees,
//     icon:    Users,
//     color:   "bg-blue-50 text-blue-600",
//     change:  null,
//   },
//   {
//     title:   "Present Today",
//     value:   stats.presentToday,
//     icon:    UserCheck,
//     color:   "bg-green-50 text-green-600",
//     change:  null,
//   },
//   {
//     title:   "Absent Today",
//     value:   stats.absentToday,
//     icon:    UserX,
//     color:   "bg-red-50 text-red-600",
//     change:  null,
//   },
//   {
//     title:   "On Leave",
//     value:   stats.onLeaveToday,
//     icon:    CalendarOff,
//     color:   "bg-orange-50 text-orange-600",
//     change:  null,
//   },
//   {
//     title:   "Pending Leaves",
//     value:   stats.pendingLeaves,
//     icon:    Clock,
//     color:   "bg-yellow-50 text-yellow-600",
//     change:  null,
//   },
//   {
//     title:   "Open Positions",
//     value:   stats.openPositions,
//     icon:    Briefcase,
//     color:   "bg-purple-50 text-purple-600",
//     change:  null,
//   },
// ];

// export default async function DashboardPage({
//   params,
// }: {
//   params: Promise<{ orgSlug: string }>;
// }) {
//   const { orgSlug } = await params;
//   const session = await auth.api.getSession({ headers: await headers() });
//   if (!session) redirect("/login");

//   const user = await prisma.user.findUnique({
//     where: { id: session.user.id },
//     include: { organization: true },
//   });
//   if (!user?.organization) redirect("/select-org");

//   const stats   = await getDashboardStats(user.organization.id, user.branchId);
//   const cards   = STAT_CARDS(stats);
//   const today   = formatDate(new Date());

//   // Recent leave requests
//   const recentLeaves = await prisma.leaveRequest.findMany({
//     where: {
//       employee: { organizationId: user.organization.id },
//       status: "PENDING",
//     },
//     include: {
//       employee: { select: { firstName: true, lastName: true, avatar: true } },
//       leaveType: { select: { name: true, color: true } },
//     },
//     orderBy: { createdAt: "desc" },
//     take: 5,
//   });

//   return (
//     <div className="space-y-6">
//       {/* Page header */}
//       <div className="flex items-center justify-between">
//         <div>
//           <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
//           <p className="text-sm text-slate-500 mt-0.5">{today}</p>
//         </div>
//       </div>

//       {/* Stat cards */}
//       <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
//         {cards.map((card) => {
//           const Icon = card.icon;
//           return (
//             <div key={card.title} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow">
//               <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${card.color}`}>
//                 <Icon className="w-4.5 h-4.5" size={18} />
//               </div>
//               <div className="text-2xl font-bold text-slate-900 mb-0.5">{card.value}</div>
//               <div className="text-xs text-slate-500">{card.title}</div>
//             </div>
//           );
//         })}
//       </div>

//       {/* Bottom grid */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
//         {/* Pending Leave Requests */}
//         <div className="bg-white rounded-xl border border-slate-200">
//           <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
//             <h3 className="font-semibold text-slate-800 text-sm">Pending Leave Requests</h3>
//             <span className="text-xs text-slate-400">{recentLeaves.length} pending</span>
//           </div>

//           {recentLeaves.length === 0 ? (
//             <div className="py-12 text-center text-slate-400 text-sm">
//               No pending leave requests
//             </div>
//           ) : (
//             <div className="divide-y divide-slate-100">
//               {recentLeaves.map((leave) => (
//                 <div key={leave.id} className="flex items-center gap-3 px-5 py-3.5">
//                   <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-semibold text-xs shrink-0">
//                     {leave.employee.firstName[0]}{leave.employee.lastName[0]}
//                   </div>
//                   <div className="flex-1 min-w-0">
//                     <p className="text-sm font-medium text-slate-800 truncate">
//                       {leave.employee.firstName} {leave.employee.lastName}
//                     </p>
//                     <p className="text-xs text-slate-400">
//                       {leave.leaveType.name} · {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
//                     </p>
//                   </div>
//                   <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-100 shrink-0">
//                     Pending
//                   </span>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>

//         {/* Quick actions */}
//         <div className="bg-white rounded-xl border border-slate-200">
//           <div className="px-5 py-4 border-b border-slate-100">
//             <h3 className="font-semibold text-slate-800 text-sm">Quick Actions</h3>
//           </div>
//           <div className="grid grid-cols-2 gap-3 p-5">
//             {[
//               { label: "Add Employee",    icon: Users,       href: `/${orgSlug}/employees/new`,           color: "bg-blue-50 text-blue-600" },
//               { label: "Process Payroll", icon: DollarSign,  href: `/${orgSlug}/payroll`,                 color: "bg-green-50 text-green-600" },
//               { label: "Post Job",        icon: Briefcase,   href: `/${orgSlug}/recruitment/jobs/new`,    color: "bg-purple-50 text-purple-600" },
//               { label: "View Reports",    icon: TrendingUp,  href: `/${orgSlug}/reports`,                 color: "bg-orange-50 text-orange-600" },
//             ].map((action) => {
//               const Icon = action.icon;
//               return (
//                 <a
//                   key={action.label}
//                   href={action.href}
//                   className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all group"
//                 >
//                   <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${action.color}`}>
//                     <Icon className="w-4 h-4" />
//                   </div>
//                   <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
//                     {action.label}
//                   </span>
//                 </a>
//               );
//             })}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getHRDashboardStats,
  getEmployeeDashboardStats,
} from "@/actions/dashboard.actions";
import { HRDashboard } from "@/components/modules/dashboard/hr-dashboard";
import { EmployeeDashboard } from "@/components/modules/dashboard/employee-dashboard";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      employee: {
        include: {
          branch: { select: { name: true } },
          department: { select: { name: true } },
          position: { select: { title: true } },
        },
      },
      organization: { select: { name: true, logo: true } },
    },
  });

  if (!user?.organizationId) redirect("/select-org");

  const isHR = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"].includes(
    user.systemRole,
  );

  if (isHR) {
    const stats = await getHRDashboardStats(
      user.organizationId,
      user.branchId ?? undefined,
    );

    return (
      <HRDashboard
        stats={stats}
        orgSlug={orgSlug}
        organizationName={user.organization?.name ?? ""}
        userName={user.name}
        userRole={user.systemRole}
      />
    );
  }

  // Employee dashboard
  if (!user.employee) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-slate-500 text-sm">
            No employee record found for your account.
          </p>
          <p className="text-slate-400 text-xs mt-1">
            Please contact your HR administrator.
          </p>
        </div>
      </div>
    );
  }

  const stats = await getEmployeeDashboardStats(
    user.employee.id,
    user.organizationId,
  );

  return (
    <EmployeeDashboard
      stats={stats}
      employee={user.employee}
      orgSlug={orgSlug}
      userName={user.name}
    />
  );
}
