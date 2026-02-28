"use server";

import { prisma } from "@/lib/prisma";

// ── HR / Admin Dashboard ──────────────────────────────────────

export async function getHRDashboardStats(organizationId: string, branchId?: string) {
  const scope = { organizationId, ...(branchId ? { branchId } : {}) };
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth   = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const todayDate    = new Date(today.toDateString());

  const [
    totalEmployees,
    activeEmployees,
    onLeaveToday,
    presentToday,
    pendingLeaveRequests,
    openJobPostings,
    pendingExpenses,
    expiringContracts,
    recentHires,
    upcomingBirthdays,
    attendanceTrend,
    leaveByType,
    payrollCurrentMonth,
  ] = await Promise.all([
    // Total employees
    prisma.employee.count({ where: scope }),

    // Active employees
    prisma.employee.count({ where: { ...scope, status: "ACTIVE" } }),

    // On leave today
    prisma.leaveRequest.count({
      where: {
        employee:  { ...scope },
        status:    "APPROVED",
        startDate: { lte: todayDate },
        endDate:   { gte: todayDate },
      },
    }),

    // Present today
    prisma.attendance.count({
      where: {
        employee: { ...scope },
        date:     todayDate,
        status:   "PRESENT",
      },
    }),

    // Pending leave requests
    prisma.leaveRequest.count({
      where: { employee: { ...scope }, status: "PENDING" },
    }),

    // Open job postings
    prisma.jobPosting.count({
      where: { organizationId, status: "OPEN" },
    }),

    // Pending expense claims
    prisma.expenseClaim.count({
      where: { employee: { ...scope }, status: "PENDING" },
    }),

    // Contracts expiring in next 30 days
    prisma.contract.count({
      where: {
        employee: { ...scope },
        status:   "ACTIVE",
        endDate:  { gte: today, lte: new Date(Date.now() + 30 * 86400000) },
      },
    }),

    // Recent hires (last 30 days)
    prisma.employee.findMany({
      where:   { ...scope, hireDate: { gte: new Date(Date.now() - 30 * 86400000) } },
      select:  { id: true, firstName: true, lastName: true, hireDate: true, position: { select: { title: true } }, avatar: true },
      orderBy: { hireDate: "desc" },
      take:    5,
    }),

    // Upcoming birthdays (next 14 days) — approximate via JS after fetch
    prisma.employee.findMany({
      where:   { ...scope, status: "ACTIVE", dateOfBirth: { not: null } },
      select:  { id: true, firstName: true, lastName: true, dateOfBirth: true, avatar: true },
      take:    200,
    }),

    // Attendance trend (last 7 days)
    prisma.attendance.groupBy({
      by:      ["date", "status"],
      where:   { employee: { ...scope }, date: { gte: new Date(Date.now() - 7 * 86400000) } },
      _count:  { id: true },
      orderBy: { date: "asc" },
    }),

    // Leave requests by type this month
    prisma.leaveRequest.findMany({
      where: {
        employee:  { ...scope },
        status:    "APPROVED",
        startDate: { gte: startOfMonth, lte: endOfMonth },
      },
      include: { leaveType: { select: { name: true, color: true } } },
      take:    100,
    }),

    // Current month payroll
    prisma.payroll.findFirst({
      where:   { organizationId, ...(branchId ? { branchId } : {}), month: today.getMonth() + 1, year: today.getFullYear() },
      include: { _count: { select: { payrollItems: true } } },
    }),
  ]);

  // Filter birthdays to next 14 days
  const nowMd = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const futureMd = new Date(Date.now() + 14 * 86400000);
  const futureMdStr = `${String(futureMd.getMonth() + 1).padStart(2, "0")}-${String(futureMd.getDate()).padStart(2, "0")}`;

  const birthdaysThisWeek = upcomingBirthdays
    .filter(e => {
      if (!e.dateOfBirth) return false;
      const md = `${String(new Date(e.dateOfBirth).getMonth() + 1).padStart(2, "0")}-${String(new Date(e.dateOfBirth).getDate()).padStart(2, "0")}`;
      return md >= nowMd && md <= futureMdStr;
    })
    .slice(0, 5);

  // Aggregate attendance trend
  const trendMap: Record<string, { present: number; absent: number; late: number; onLeave: number }> = {};
  for (const row of attendanceTrend) {
    const dateStr = new Date(row.date).toLocaleDateString("en-US", { weekday: "short" });
    if (!trendMap[dateStr]) trendMap[dateStr] = { present: 0, absent: 0, late: 0, onLeave: 0 };
    if (row.status === "PRESENT") trendMap[dateStr].present   += row._count.id;
    if (row.status === "ABSENT")  trendMap[dateStr].absent    += row._count.id;
    if (row.status === "LATE")    trendMap[dateStr].late      += row._count.id;
    if (row.status === "ON_LEAVE") trendMap[dateStr].onLeave  += row._count.id;
  }
  const attendanceChartData = Object.entries(trendMap).map(([day, v]) => ({ day, ...v }));

  // Aggregate leave by type
  const leaveTypeMap: Record<string, number> = {};
  for (const lr of leaveByType) {
    const name = lr.leaveType.name;
    leaveTypeMap[name] = (leaveTypeMap[name] || 0) + Number(lr.totalDays);
  }
  const leaveChartData = Object.entries(leaveTypeMap).map(([name, days]) => ({ name, days }));

  return {
    totalEmployees,
    activeEmployees,
    onLeaveToday,
    presentToday,
    pendingLeaveRequests,
    openJobPostings,
    pendingExpenses,
    expiringContracts,
    recentHires,
    birthdaysThisWeek,
    attendanceChartData,
    leaveChartData,
    payrollCurrentMonth,
    absentToday: totalEmployees - presentToday - onLeaveToday,
  };
}

// ── Employee Dashboard ────────────────────────────────────────

export async function getEmployeeDashboardStats(employeeId: string, organizationId: string) {
  const today      = new Date();
  const todayDate  = new Date(today.toDateString());
  const thisYear   = today.getFullYear();
  const thisMonth  = today.getMonth() + 1;

  const [
    todayAttendance,
    leaveBalances,
    pendingLeaveRequests,
    upcomingLeave,
    recentPayslips,
    openGoals,
    pendingReviews,
    recentAnnouncements,
    monthlyAttendance,
  ] = await Promise.all([
    // Today's attendance
    prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: todayDate } },
    }),

    // Leave balances
    prisma.leaveBalance.findMany({
      where:   { employeeId, year: thisYear },
      include: { leaveType: { select: { name: true, color: true } } },
    }),

    // Pending leave requests
    prisma.leaveRequest.count({
      where: { employeeId, status: "PENDING" },
    }),

    // Upcoming approved leave
    prisma.leaveRequest.findMany({
      where:   { employeeId, status: "APPROVED", startDate: { gte: todayDate } },
      include: { leaveType: { select: { name: true, color: true } } },
      orderBy: { startDate: "asc" },
      take:    3,
    }),

    // Recent payslips
    prisma.payrollItem.findMany({
      where:   { employeeId },
      include: { payroll: { select: { month: true, year: true, status: true } } },
      orderBy: { createdAt: "desc" },
      take:    3,
    }),

    // Open goals
    prisma.goal.findMany({
      where:   { employeeId, status: { in: ["NOT_STARTED", "IN_PROGRESS"] } },
      orderBy: { dueDate: "asc" },
      take:    4,
    }),

    // Pending performance reviews
    prisma.performanceReview.count({
      where: { employeeId, status: { in: ["DRAFT", "IN_PROGRESS"] } },
    }),

    // Recent announcements visible to this employee
    prisma.announcement.findMany({
      where: {
        organizationId,
        publishedAt: { lte: today },
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: today } },
        ],
      },
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
      take:    3,
    }),

    // Monthly attendance summary
    prisma.attendance.groupBy({
      by:     ["status"],
      where:  {
        employeeId,
        date: {
          gte: new Date(thisYear, thisMonth - 1, 1),
          lte: new Date(thisYear, thisMonth, 0),
        },
      },
      _count: { id: true },
    }),
  ]);

  const attendanceSummary = Object.fromEntries(
    monthlyAttendance.map(r => [r.status, r._count.id])
  );

  return {
    todayAttendance,
    leaveBalances,
    pendingLeaveRequests,
    upcomingLeave,
    recentPayslips,
    openGoals,
    pendingReviews,
    recentAnnouncements,
    attendanceSummary,
  };
}
