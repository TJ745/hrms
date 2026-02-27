"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/actions/audit.actions";
import { createNotification } from "@/actions/notification.actions";
import { sendMail, emailTemplates } from "@/lib/nodemailer";
import { formatDate } from "@/lib/utils";

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

// ── Request Leave ────────────────────────────────────────────

export async function requestLeave(input: {
  employeeId:   string;
  leaveTypeId:  string;
  startDate:    string;
  endDate:      string;
  reason?:      string;
  isHalfDay?:   boolean;
  halfDayPeriod?: string;
  attachmentUrl?: string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const start = new Date(input.startDate);
  const end   = new Date(input.endDate);

  if (end < start) return { success: false, error: "End date cannot be before start date" };

  // Calculate working days
  let totalDays = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) totalDays++; // skip weekends
    current.setDate(current.getDate() + 1);
  }
  if (input.isHalfDay) totalDays = 0.5;

  // Check leave balance
  const year    = new Date().getFullYear();
  const balance = await prisma.leaveBalance.findUnique({
    where: { employeeId_leaveTypeId_year: { employeeId: input.employeeId, leaveTypeId: input.leaveTypeId, year } },
  });

  if (balance) {
    const available = Number(balance.allocated) + Number(balance.carried) - Number(balance.used) - Number(balance.pending);
    if (totalDays > available) {
      return { success: false, error: `Insufficient leave balance. Available: ${available} days` };
    }
  }

  // Check for overlapping leave requests
  const overlap = await prisma.leaveRequest.findFirst({
    where: {
      employeeId: input.employeeId,
      status:     { in: ["PENDING", "APPROVED"] },
      OR: [
        { startDate: { lte: end },   endDate: { gte: start } },
      ],
    },
  });
  if (overlap) return { success: false, error: "You already have a leave request for overlapping dates" };

  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      employeeId:    input.employeeId,
      leaveTypeId:   input.leaveTypeId,
      startDate:     start,
      endDate:       end,
      totalDays,
      reason:        input.reason        ?? null,
      isHalfDay:     input.isHalfDay     ?? false,
      halfDayPeriod: input.halfDayPeriod ?? null,
      attachmentUrl: input.attachmentUrl ?? null,
      status:        "PENDING",
    },
    include: {
      employee:  { select: { firstName: true, lastName: true, managerId: true, user: { select: { email: true } } } },
      leaveType: { select: { name: true } },
    },
  });

  // Update pending balance
  if (balance) {
    await prisma.leaveBalance.update({
      where: { id: balance.id },
      data:  { pending: { increment: totalDays } },
    });
  }

  // Notify manager
  if (leaveRequest.employee.managerId) {
    const manager = await prisma.employee.findUnique({
      where:   { id: leaveRequest.employee.managerId },
      include: { user: { select: { id: true } } },
    });
    if (manager) {
      await createNotification({
        userId: manager.user.id,
        type:   "LEAVE_REQUEST",
        title:  "New Leave Request",
        body:   `${leaveRequest.employee.firstName} ${leaveRequest.employee.lastName} requested ${leaveRequest.leaveType.name} from ${formatDate(start)} to ${formatDate(end)}`,
        link:   `/leave/requests`,
      });
    }
  }

  revalidatePath("/[orgSlug]/leave", "page");
  return { success: true, data: leaveRequest };
}

// ── Approve / Reject Leave ───────────────────────────────────

export async function updateLeaveStatus(input: {
  leaveRequestId: string;
  status:         "APPROVED" | "REJECTED";
  reason?:        string;
  organizationId: string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const leaveRequest = await prisma.leaveRequest.findUnique({
    where:   { id: input.leaveRequestId },
    include: {
      employee:  { select: { firstName: true, lastName: true, user: { select: { id: true, email: true } } } },
      leaveType: { select: { name: true } },
    },
  });
  if (!leaveRequest) return { success: false, error: "Leave request not found" };
  if (leaveRequest.status !== "PENDING") return { success: false, error: "This request has already been processed" };

  const updated = await prisma.leaveRequest.update({
    where: { id: input.leaveRequestId },
    data: {
      status:         input.status,
      approvedById:   session.user.id,
      approvedAt:     new Date(),
      rejectedReason: input.status === "REJECTED" ? (input.reason ?? null) : null,
    },
  });

  // Update leave balance
  const year    = leaveRequest.startDate.getFullYear();
  const balance = await prisma.leaveBalance.findUnique({
    where: { employeeId_leaveTypeId_year: {
      employeeId:  leaveRequest.employeeId,
      leaveTypeId: leaveRequest.leaveTypeId,
      year,
    }},
  });

  if (balance) {
    if (input.status === "APPROVED") {
      await prisma.leaveBalance.update({
        where: { id: balance.id },
        data: {
          pending: { decrement: Number(leaveRequest.totalDays) },
          used:    { increment: Number(leaveRequest.totalDays) },
        },
      });
    } else {
      await prisma.leaveBalance.update({
        where: { id: balance.id },
        data:  { pending: { decrement: Number(leaveRequest.totalDays) } },
      });
    }
  }

  // Notify employee
  await createNotification({
    userId: leaveRequest.employee.user.id,
    type:   input.status === "APPROVED" ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
    title:  input.status === "APPROVED" ? "Leave Approved" : "Leave Rejected",
    body:   input.status === "APPROVED"
      ? `Your ${leaveRequest.leaveType.name} leave has been approved`
      : `Your ${leaveRequest.leaveType.name} leave was rejected. ${input.reason ?? ""}`,
  });

  // Send email
  try {
    if (input.status === "APPROVED") {
      const tpl = emailTemplates.leaveApproved(
        leaveRequest.employee.firstName,
        leaveRequest.leaveType.name,
        formatDate(leaveRequest.startDate),
        formatDate(leaveRequest.endDate),
      );
      await sendMail({ to: leaveRequest.employee.user.email, ...tpl });
    } else {
      const tpl = emailTemplates.leaveRejected(
        leaveRequest.employee.firstName,
        leaveRequest.leaveType.name,
        input.reason ?? "No reason provided",
      );
      await sendMail({ to: leaveRequest.employee.user.email, ...tpl });
    }
  } catch { /* email failure should not block the action */ }

  await createAuditLog({
    organizationId: input.organizationId,
    userId:         session.user.id,
    action:         input.status === "APPROVED" ? "APPROVE" : "REJECT",
    entity:         "LeaveRequest",
    entityId:       input.leaveRequestId,
  });

  revalidatePath("/[orgSlug]/leave", "page");
  return { success: true, data: updated };
}

// ── Get Leave Requests ───────────────────────────────────────

export async function getLeaveRequests(params: {
  organizationId: string;
  branchId?:      string;
  employeeId?:    string;
  status?:        string;
  page?:          number;
  perPage?:       number;
}) {
  const { organizationId, branchId, employeeId, status, page = 1, perPage = 20 } = params;

  const where = {
    employee: {
      organizationId,
      ...(branchId ? { branchId } : {}),
    },
    ...(employeeId ? { employeeId } : {}),
    ...(status && status !== "ALL" ? { status: status as any } : {}),
  };

  const [requests, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      include: {
        employee:  { select: { id: true, firstName: true, lastName: true, avatar: true, employeeCode: true, department: { select: { name: true } } } },
        leaveType: { select: { id: true, name: true, color: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.leaveRequest.count({ where }),
  ]);

  return { requests, total, page, perPage, totalPages: Math.ceil(total / perPage) };
}

// ── Get Leave Balances ───────────────────────────────────────

export async function getLeaveBalances(employeeId: string, year?: number) {
  const currentYear = year ?? new Date().getFullYear();

  return prisma.leaveBalance.findMany({
    where:   { employeeId, year: currentYear },
    include: { leaveType: { select: { name: true, color: true, category: true } } },
  });
}

// ── Initialize Leave Balances (for new employee) ─────────────

export async function initLeaveBalances(employeeId: string, organizationId: string) {
  const year       = new Date().getFullYear();
  const leaveTypes = await prisma.leaveType.findMany({
    where: { organizationId, isActive: true },
  });

  await prisma.leaveBalance.createMany({
    data: leaveTypes.map((lt) => ({
      employeeId,
      leaveTypeId: lt.id,
      year,
      allocated:   lt.daysAllowed,
      used:        0,
      pending:     0,
      carried:     0,
    })),
    skipDuplicates: true,
  });
}
