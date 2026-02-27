"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/actions/audit.actions";
import { createNotification } from "@/actions/notification.actions";
import { getDistanceFromLatLng } from "@/lib/utils";
import type { AttendanceStatus } from "@prisma/client";

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

// ── Clock In ─────────────────────────────────────────────────

export async function clockIn(input: {
  employeeId: string;
  lat?:       number;
  lng?:       number;
  accuracy?:  number;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if already clocked in today
  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: input.employeeId, date: today } },
  });

  if (existing?.checkIn) return { success: false, error: "Already clocked in today" };

  // Geo validation — check if within branch radius
  if (input.lat && input.lng) {
    const employee = await prisma.employee.findUnique({
      where:   { id: input.employeeId },
      include: { branch: { select: { latitude: true, longitude: true, geoRadius: true } } },
    });

    if (
      employee?.branch.latitude &&
      employee?.branch.longitude &&
      employee?.branch.geoRadius
    ) {
      const distance = getDistanceFromLatLng(
        input.lat, input.lng,
        Number(employee.branch.latitude),
        Number(employee.branch.longitude)
      );
      if (distance > employee.branch.geoRadius) {
        return {
          success: false,
          error: `You are ${Math.round(distance)}m away from the office. Must be within ${employee.branch.geoRadius}m to clock in.`,
        };
      }
    }
  }

  // Determine if late (after 09:15 by default — TODO: use work schedule)
  const now     = new Date();
  const hours   = now.getHours();
  const minutes = now.getMinutes();
  const isLate  = hours > 9 || (hours === 9 && minutes > 15);

  const attendance = await prisma.attendance.upsert({
    where:  { employeeId_date: { employeeId: input.employeeId, date: today } },
    create: {
      employeeId:     input.employeeId,
      date:           today,
      checkIn:        now,
      checkInLat:     input.lat      ?? null,
      checkInLng:     input.lng      ?? null,
      checkInAccuracy: input.accuracy ?? null,
      status:         isLate ? "LATE" : "PRESENT",
    },
    update: {
      checkIn:        now,
      checkInLat:     input.lat      ?? null,
      checkInLng:     input.lng      ?? null,
      checkInAccuracy: input.accuracy ?? null,
      status:         isLate ? "LATE" : "PRESENT",
    },
  });

  revalidatePath("/[orgSlug]/attendance", "page");
  return { success: true, data: attendance };
}

// ── Clock Out ────────────────────────────────────────────────

export async function clockOut(input: {
  employeeId: string;
  lat?:       number;
  lng?:       number;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: input.employeeId, date: today } },
  });

  if (!existing?.checkIn)  return { success: false, error: "No clock-in found for today" };
  if (existing?.checkOut)  return { success: false, error: "Already clocked out today" };

  const now       = new Date();
  const diffMs    = now.getTime() - existing.checkIn.getTime();
  const workHours = Math.max(0, (diffMs / (1000 * 60 * 60)) - 1); // subtract 1hr break
  const overtime  = Math.max(0, workHours - 8);

  const attendance = await prisma.attendance.update({
    where: { id: existing.id },
    data: {
      checkOut:    now,
      checkOutLat: input.lat ?? null,
      checkOutLng: input.lng ?? null,
      workHours:   Math.round(workHours * 100) / 100,
      overtime:    Math.round(overtime   * 100) / 100,
    },
  });

  revalidatePath("/[orgSlug]/attendance", "page");
  return { success: true, data: attendance };
}

// ── Get Today's Attendance ───────────────────────────────────

export async function getTodayAttendance(employeeId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date: today } },
  });
}

// ── Get Attendance History ───────────────────────────────────

export async function getAttendanceHistory(params: {
  organizationId: string;
  branchId?:      string;
  employeeId?:    string;
  month:          number;
  year:           number;
  page?:          number;
  perPage?:       number;
}) {
  const { organizationId, branchId, employeeId, month, year, page = 1, perPage = 30 } = params;

  const startDate = new Date(year, month - 1, 1);
  const endDate   = new Date(year, month, 0);

  const where = {
    employee: {
      organizationId,
      ...(branchId ? { branchId } : {}),
    },
    ...(employeeId ? { employeeId } : {}),
    date: { gte: startDate, lte: endDate },
  };

  const [records, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true, firstName: true, lastName: true,
            avatar: true, employeeCode: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: [{ date: "desc" }, { employee: { firstName: "asc" } }],
      skip:  (page - 1) * perPage,
      take:  perPage,
    }),
    prisma.attendance.count({ where }),
  ]);

  return { records, total, page, perPage, totalPages: Math.ceil(total / perPage) };
}

// ── Get Monthly Summary ──────────────────────────────────────

export async function getAttendanceSummary(employeeId: string, month: number, year: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate   = new Date(year, month, 0);

  const records = await prisma.attendance.findMany({
    where: { employeeId, date: { gte: startDate, lte: endDate } },
    orderBy: { date: "asc" },
  });

  const summary = {
    present:   records.filter(r => r.status === "PRESENT").length,
    absent:    records.filter(r => r.status === "ABSENT").length,
    late:      records.filter(r => r.status === "LATE").length,
    halfDay:   records.filter(r => r.status === "HALF_DAY").length,
    onLeave:   records.filter(r => r.status === "ON_LEAVE").length,
    totalHours: records.reduce((sum, r) => sum + Number(r.workHours ?? 0), 0),
    overtime:   records.reduce((sum, r) => sum + Number(r.overtime  ?? 0), 0),
  };

  return { records, summary };
}

// ── Manual Attendance (HR) ───────────────────────────────────

export async function markAttendanceManual(input: {
  employeeId: string;
  date:       string;
  status:     AttendanceStatus;
  checkIn?:   string;
  checkOut?:  string;
  notes?:     string;
  organizationId: string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const date = new Date(input.date);
  date.setHours(0, 0, 0, 0);

  const attendance = await prisma.attendance.upsert({
    where:  { employeeId_date: { employeeId: input.employeeId, date } },
    create: {
      employeeId: input.employeeId,
      date,
      status:     input.status,
      checkIn:    input.checkIn  ? new Date(input.checkIn)  : null,
      checkOut:   input.checkOut ? new Date(input.checkOut) : null,
      notes:      input.notes    ?? null,
      isManual:   true,
      approvedBy: session.user.id,
    },
    update: {
      status:     input.status,
      checkIn:    input.checkIn  ? new Date(input.checkIn)  : null,
      checkOut:   input.checkOut ? new Date(input.checkOut) : null,
      notes:      input.notes    ?? null,
      isManual:   true,
      approvedBy: session.user.id,
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId:         session.user.id,
    action:         "UPDATE",
    entity:         "Attendance",
    entityId:       attendance.id,
    newValues:      { status: input.status, date: input.date, isManual: true },
  });

  revalidatePath("/[orgSlug]/attendance", "page");
  return { success: true, data: attendance };
}
