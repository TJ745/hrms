"use server";

import { prisma } from "@/lib/prisma";

export async function getHeadcountReport(organizationId: string) {
  const [byDepartment, byEmploymentType, byStatus, byBranch, monthlyHires] = await Promise.all([
    prisma.employee.groupBy({
      by:      ["departmentId"],
      where:   { organizationId },
      _count:  { id: true },
    }),
    prisma.employee.groupBy({
      by:     ["employmentType"],
      where:  { organizationId },
      _count: { id: true },
    }),
    prisma.employee.groupBy({
      by:     ["status"],
      where:  { organizationId },
      _count: { id: true },
    }),
    prisma.employee.groupBy({
      by:     ["branchId"],
      where:  { organizationId },
      _count: { id: true },
    }),
    // Last 12 months hiring trend
    prisma.$queryRaw<{ month: string; count: bigint }[]>`
      SELECT TO_CHAR(DATE_TRUNC('month', "hireDate"), 'Mon YY') AS month,
             COUNT(*) AS count
      FROM "Employee"
      WHERE "organizationId" = ${organizationId}
        AND "hireDate" >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', "hireDate")
      ORDER BY DATE_TRUNC('month', "hireDate") ASC
    `.catch(() => []),
  ]);

  // Enrich with names
  const deptIds    = [...new Set(byDepartment.map((d) => d.departmentId).filter(Boolean))] as string[];
  const branchIds  = [...new Set(byBranch.map((b) => b.branchId).filter(Boolean))] as string[];

  const [depts, branches] = await Promise.all([
    prisma.department.findMany({ where: { id: { in: deptIds } }, select: { id: true, name: true } }),
    prisma.branch.findMany({ where: { id: { in: branchIds } }, select: { id: true, name: true } }),
  ]);

  const deptMap   = Object.fromEntries(depts.map((d) => [d.id, d.name]));
  const branchMap = Object.fromEntries(branches.map((b) => [b.id, b.name]));

  return {
    byDepartment:    byDepartment.map((d) => ({ name: deptMap[d.departmentId ?? ""] ?? "Unassigned", count: d._count.id })),
    byEmploymentType: byEmploymentType.map((e) => ({ name: e.employmentType, count: e._count.id })),
    byStatus:        byStatus.map((s) => ({ name: s.status, count: s._count.id })),
    byBranch:        byBranch.map((b) => ({ name: branchMap[b.branchId ?? ""] ?? "Unassigned", count: b._count.id })),
    monthlyHires:    monthlyHires.map((m) => ({ month: m.month, count: Number(m.count) })),
  };
}

export async function getAttendanceReport(organizationId: string, year?: number, month?: number) {
  const targetYear  = year  ?? new Date().getFullYear();
  const targetMonth = month ?? new Date().getMonth() + 1;

  const startDate = new Date(targetYear, targetMonth - 1, 1);
  const endDate   = new Date(targetYear, targetMonth, 0);

  const [records, byStatus] = await Promise.all([
    prisma.attendance.groupBy({
      by:    ["employeeId"],
      where: {
        employee: { organizationId },
        date: { gte: startDate, lte: endDate },
      },
      _count: { id: true },
      _avg:   { workHours: true },
    }),
    prisma.attendance.groupBy({
      by:    ["status"],
      where: {
        employee: { organizationId },
        date: { gte: startDate, lte: endDate },
      },
      _count: { id: true },
    }),
  ]);

  const totalDays    = endDate.getDate();
  const avgWorkHours = records.length > 0
    ? records.reduce((sum, r) => sum + (r._avg.workHours ?? 0), 0) / records.length
    : 0;

  return {
    month:         `${startDate.toLocaleString("default", { month: "long" })} ${targetYear}`,
    totalDays,
    avgWorkHours:  Math.round(avgWorkHours * 10) / 10,
    byStatus:      byStatus.map((s) => ({ name: s.status, count: s._count.id })),
    totalRecords:  records.length,
  };
}

export async function getLeaveReport(organizationId: string, year?: number) {
  const targetYear = year ?? new Date().getFullYear();

  const [byType, byStatus, byMonth] = await Promise.all([
    prisma.leaveRequest.groupBy({
      by:    ["leaveTypeId"],
      where: {
        employee: { organizationId },
        startDate: { gte: new Date(targetYear, 0, 1), lte: new Date(targetYear, 11, 31) },
      },
      _count: { id: true },
      _sum:   { totalDays: true },
    }),
    prisma.leaveRequest.groupBy({
      by:    ["status"],
      where: {
        employee: { organizationId },
        startDate: { gte: new Date(targetYear, 0, 1), lte: new Date(targetYear, 11, 31) },
      },
      _count: { id: true },
    }),
    prisma.$queryRaw<{ month: string; count: bigint; days: number }[]>`
      SELECT TO_CHAR(DATE_TRUNC('month', "startDate"), 'Mon') AS month,
             COUNT(*) AS count,
             SUM("totalDays") AS days
      FROM "LeaveRequest"
      WHERE "employeeId" IN (
        SELECT id FROM "Employee" WHERE "organizationId" = ${organizationId}
      )
      AND EXTRACT(YEAR FROM "startDate") = ${targetYear}
      GROUP BY DATE_TRUNC('month', "startDate")
      ORDER BY DATE_TRUNC('month', "startDate") ASC
    `.catch(() => []),
  ]);

  const leaveTypeIds = [...new Set(byType.map((t) => t.leaveTypeId))];
  const leaveTypes   = await prisma.leaveType.findMany({
    where:  { id: { in: leaveTypeIds } },
    select: { id: true, name: true },
  });
  const typeMap = Object.fromEntries(leaveTypes.map((t) => [t.id, t.name]));

  return {
    year:     targetYear,
    byType:   byType.map((t) => ({ name: typeMap[t.leaveTypeId] ?? "Unknown", count: t._count.id, days: Number(t._sum.totalDays ?? 0) })),
    byStatus: byStatus.map((s) => ({ name: s.status, count: s._count.id })),
    byMonth:  byMonth.map((m) => ({ month: m.month, count: Number(m.count), days: Number(m.days) })),
  };
}

export async function getPayrollReport(organizationId: string, year?: number) {
  const targetYear = year ?? new Date().getFullYear();

  const payrolls = await prisma.payroll.findMany({
    where: {
      organizationId,
      year: targetYear,
    },
    include: {
      payrollItems: {
        select: {
          grossSalary: true,
          netSalary:   true,
          totalDeductions: true,
        },
      },
    },
    orderBy: { month: "asc" },
  });

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const monthly = payrolls.map((p) => ({
    month:      MONTHS[p.month - 1],
    gross:      p.payrollItems.reduce((s, i) => s + Number(i.grossSalary), 0),
    net:        p.payrollItems.reduce((s, i) => s + Number(i.netSalary),   0),
    deductions: p.payrollItems.reduce((s, i) => s + Number(i.totalDeductions), 0),
    headcount:  p.payrollItems.length,
  }));

  const totalGross      = monthly.reduce((s, m) => s + m.gross, 0);
  const totalNet        = monthly.reduce((s, m) => s + m.net,   0);
  const totalDeductions = monthly.reduce((s, m) => s + m.deductions, 0);

  return { year: targetYear, monthly, totalGross, totalNet, totalDeductions };
}

export async function getRecruitmentReport(organizationId: string) {
  const [byStatus, byJob, openPositions] = await Promise.all([
    prisma.application.groupBy({
      by:    ["status"],
      where: { jobPosting: { organizationId } },
      _count: { id: true },
    }),
    prisma.application.groupBy({
      by:    ["jobPostingId"],
      where: { jobPosting: { organizationId } },
      _count: { id: true },
    }),
    prisma.jobPosting.count({
      where: { organizationId, status: "OPEN" },
    }),
  ]);

  const jobIds   = byJob.map((j) => j.jobPostingId);
  const jobs     = await prisma.jobPosting.findMany({
    where:  { id: { in: jobIds } },
    select: { id: true, title: true },
  });
  const jobMap   = Object.fromEntries(jobs.map((j) => [j.id, j.title]));

  return {
    byStatus:      byStatus.map((s) => ({ name: s.status, count: s._count.id })),
    byJob:         byJob.map((j) => ({ name: jobMap[j.jobPostingId] ?? "Unknown", count: j._count.id })),
    openPositions,
    totalApplicants: byStatus.reduce((s, b) => s + b._count.id, 0),
  };
}
