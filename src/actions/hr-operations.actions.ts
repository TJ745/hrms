"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/actions/audit.actions";
import { createNotification } from "@/actions/notification.actions";
import type { TransferStatus, ResignationStatus, OfficialLetterType } from "@prisma/client";

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

// ══════════════════════════════════════════════
// HOLIDAYS
// ══════════════════════════════════════════════

export async function createHoliday(input: {
  organizationId: string;
  branchId?:      string;
  name:           string;
  date:           string;
  isRecurring?:   boolean;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const holiday = await prisma.holiday.create({
    data: {
      organizationId: input.organizationId,
      branchId:       input.branchId    ?? null,
      name:           input.name,
      date:           new Date(input.date),
      isRecurring:    input.isRecurring ?? false,
    },
  });

  revalidatePath("/[orgSlug]/holidays");
  return { success: true, data: holiday };
}

export async function updateHoliday(input: {
  holidayId:      string;
  name?:          string;
  date?:          string;
  isRecurring?:   boolean;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const holiday = await prisma.holiday.update({
    where: { id: input.holidayId },
    data: {
      ...(input.name        !== undefined ? { name:        input.name }                   : {}),
      ...(input.date        !== undefined ? { date:        new Date(input.date) }          : {}),
      ...(input.isRecurring !== undefined ? { isRecurring: input.isRecurring }            : {}),
    },
  });

  revalidatePath("/[orgSlug]/holidays");
  return { success: true, data: holiday };
}

export async function deleteHoliday(holidayId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  await prisma.holiday.delete({ where: { id: holidayId } });
  revalidatePath("/[orgSlug]/holidays");
  return { success: true };
}

export async function getHolidays(organizationId: string, branchId?: string, year?: number) {
  const targetYear = year ?? new Date().getFullYear();
  const holidays = await prisma.holiday.findMany({
    where: {
      organizationId,
      ...(branchId ? { OR: [{ branchId }, { branchId: null }] } : {}),
      date: {
        gte: new Date(targetYear, 0, 1),
        lte: new Date(targetYear, 11, 31),
      },
    },
    include: { branch: { select: { name: true } } },
    orderBy: { date: "asc" },
  });
  return holidays;
}

// ══════════════════════════════════════════════
// ASSETS
// ══════════════════════════════════════════════

export async function createAsset(input: {
  organizationId: string;
  employeeId?:    string;
  name:           string;
  category?:      string;
  serialNumber?:  string;
  brand?:         string;
  model?:         string;
  purchaseDate?:  string;
  purchasePrice?: number;
  condition?:     string;
  notes?:         string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const asset = await prisma.asset.create({
    data: {
      organizationId: input.organizationId,
      employeeId:     input.employeeId    ?? null,
      name:           input.name,
      category:       input.category      ?? null,
      serialNumber:   input.serialNumber  ?? null,
      brand:          input.brand         ?? null,
      model:          input.model         ?? null,
      purchaseDate:   input.purchaseDate  ? new Date(input.purchaseDate) : null,
      purchasePrice:  input.purchasePrice ?? null,
      condition:      input.condition     ?? null,
      notes:          input.notes         ?? null,
      assignedAt:     input.employeeId    ? new Date() : null,
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId:         session.user.id,
    action:         "CREATE",
    entity:         "Asset",
    entityId:       asset.id,
    newValues:      { name: input.name, category: input.category },
  });

  revalidatePath("/[orgSlug]/assets");
  return { success: true, data: asset };
}

export async function assignAsset(input: {
  assetId:        string;
  employeeId:     string;
  organizationId: string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const asset = await prisma.asset.update({
    where: { id: input.assetId },
    data: {
      employeeId: input.employeeId,
      assignedAt: new Date(),
      returnedAt: null,
    },
  });

  revalidatePath("/[orgSlug]/assets");
  return { success: true, data: asset };
}

export async function returnAsset(input: {
  assetId:        string;
  organizationId: string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const asset = await prisma.asset.update({
    where: { id: input.assetId },
    data: {
      employeeId: null,
      returnedAt: new Date(),
    },
  });

  revalidatePath("/[orgSlug]/assets");
  return { success: true, data: asset };
}

export async function deleteAsset(assetId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  await prisma.asset.delete({ where: { id: assetId } });
  revalidatePath("/[orgSlug]/assets");
  return { success: true };
}

export async function getAssets(input: {
  organizationId: string;
  employeeId?:    string;
  category?:      string;
  unassigned?:    boolean;
}) {
  const where: any = {
    organizationId: input.organizationId,
    ...(input.employeeId  ? { employeeId: input.employeeId }    : {}),
    ...(input.category    ? { category: input.category }         : {}),
    ...(input.unassigned  ? { employeeId: null }                 : {}),
  };

  return prisma.asset.findMany({
    where,
    include: {
      employee: { select: { firstName: true, lastName: true, employeeCode: true, avatar: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ══════════════════════════════════════════════
// EMPLOYEE TRANSFERS
// ══════════════════════════════════════════════

export async function createTransfer(input: {
  employeeId:       string;
  organizationId:   string;
  fromBranchId:     string;
  toBranchId:       string;
  fromDepartmentId?: string;
  toDepartmentId?:  string;
  fromPositionId?:  string;
  toPositionId?:    string;
  effectiveDate:    string;
  reason?:          string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const transfer = await prisma.employeeTransfer.create({
    data: {
      employeeId:       input.employeeId,
      fromBranchId:     input.fromBranchId,
      toBranchId:       input.toBranchId,
      fromDepartmentId: input.fromDepartmentId ?? null,
      toDepartmentId:   input.toDepartmentId   ?? null,
      fromPositionId:   input.fromPositionId   ?? null,
      toPositionId:     input.toPositionId     ?? null,
      effectiveDate:    new Date(input.effectiveDate),
      reason:           input.reason           ?? null,
      status:           "PENDING",
    },
    include: { employee: { include: { user: { select: { id: true } } } } },
  });

  // Notify employee
  await createNotification({
    userId: transfer.employee.user.id,
    type:   "GENERAL",
    title:  "Transfer Request Initiated",
    body:   "A transfer request has been submitted for your profile.",
    link:   `/transfers`,
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId:         session.user.id,
    action:         "CREATE",
    entity:         "EmployeeTransfer",
    entityId:       transfer.id,
    newValues:      { toBranchId: input.toBranchId, effectiveDate: input.effectiveDate },
  });

  revalidatePath("/[orgSlug]/transfers");
  return { success: true, data: transfer };
}

export async function approveTransfer(input: {
  transferId:     string;
  status:         TransferStatus;
  organizationId: string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const transfer = await prisma.employeeTransfer.update({
    where: { id: input.transferId },
    data: {
      status:     input.status,
      approvedBy: session.user.id,
      approvedAt: new Date(),
    },
    include: {
      employee: {
        include: { user: { select: { id: true } } },
      },
    },
  });

  // If approved, update employee's branch/dept/position
  if (input.status === "COMPLETED") {
    await prisma.employee.update({
      where: { id: transfer.employeeId },
      data: {
        branchId:     transfer.toBranchId,
        departmentId: transfer.toDepartmentId ?? undefined,
        positionId:   transfer.toPositionId   ?? undefined,
      },
    });
  }

  await createNotification({
    userId: transfer.employee.user.id,
    type:   "GENERAL",
    title:  `Transfer ${input.status === "COMPLETED" ? "Completed" : input.status === "REJECTED" ? "Rejected" : "Approved"}`,
    body:   `Your transfer request has been ${input.status.toLowerCase()}.`,
    link:   `/transfers`,
  });

  revalidatePath("/[orgSlug]/transfers");
  return { success: true, data: transfer };
}

export async function getTransfers(input: {
  organizationId: string;
  employeeId?:    string;
  status?:        TransferStatus;
}) {
  return prisma.employeeTransfer.findMany({
    where: {
      employee: { organizationId: input.organizationId },
      ...(input.employeeId ? { employeeId: input.employeeId } : {}),
      ...(input.status     ? { status: input.status }         : {}),
    },
    include: {
      employee:   { select: { firstName: true, lastName: true, employeeCode: true, avatar: true } },
      fromBranch: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ══════════════════════════════════════════════
// RESIGNATIONS
// ══════════════════════════════════════════════

export async function submitResignation(input: {
  employeeId:       string;
  organizationId:   string;
  resignationDate:  string;
  lastWorkingDate:  string;
  reason?:          string;
  notes?:           string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  // Check for existing pending/approved resignation
  const existing = await prisma.resignation.findFirst({
    where: { employeeId: input.employeeId, status: { in: ["PENDING", "APPROVED"] } },
  });
  if (existing) return { success: false, error: "An active resignation already exists for this employee" };

  const resignation = await prisma.resignation.create({
    data: {
      employeeId:      input.employeeId,
      resignationDate: new Date(input.resignationDate),
      lastWorkingDate: new Date(input.lastWorkingDate),
      reason:          input.reason ?? null,
      notes:           input.notes  ?? null,
      status:          "PENDING",
    },
    include: { employee: { include: { user: { select: { id: true } } } } },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId:         session.user.id,
    action:         "CREATE",
    entity:         "Resignation",
    entityId:       resignation.id,
    newValues:      { lastWorkingDate: input.lastWorkingDate },
  });

  revalidatePath("/[orgSlug]/resignations");
  return { success: true, data: resignation };
}

export async function updateResignationStatus(input: {
  resignationId:    string;
  status:           ResignationStatus;
  organizationId:   string;
  exitInterviewDone?: boolean;
  clearanceStatus?: string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const resignation = await prisma.resignation.update({
    where: { id: input.resignationId },
    data: {
      status:           input.status,
      approvedBy:       session.user.id,
      approvedAt:       new Date(),
      exitInterviewDone: input.exitInterviewDone ?? undefined,
      clearanceStatus:  input.clearanceStatus    ?? undefined,
    },
    include: { employee: { include: { user: { select: { id: true } } } } },
  });

  // If completed, update employee status
  if (input.status === "COMPLETED") {
    await prisma.employee.update({
      where: { id: resignation.employeeId },
      data: {
        status:          "RESIGNED",
        terminationDate: resignation.lastWorkingDate,
      },
    });
  }

  await createNotification({
    userId: resignation.employee.user.id,
    type:   "GENERAL",
    title:  `Resignation ${input.status}`,
    body:   `Your resignation has been ${input.status.toLowerCase()}.`,
    link:   `/resignations`,
  });

  revalidatePath("/[orgSlug]/resignations");
  return { success: true, data: resignation };
}

export async function getResignations(input: {
  organizationId: string;
  status?:        ResignationStatus;
}) {
  return prisma.resignation.findMany({
    where: {
      employee: { organizationId: input.organizationId },
      ...(input.status ? { status: input.status } : {}),
    },
    include: {
      employee: {
        select: {
          firstName: true, lastName: true, employeeCode: true, avatar: true,
          department: { select: { name: true } },
          position:   { select: { title: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ══════════════════════════════════════════════
// DISCIPLINARY RECORDS
// ══════════════════════════════════════════════

export async function createDisciplinaryRecord(input: {
  employeeId:    string;
  organizationId: string;
  type:          string;
  reason:        string;
  description?:  string;
  issuedAt:      string;
  expiresAt?:    string;
  fileUrl?:      string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const record = await prisma.disciplinaryRecord.create({
    data: {
      employeeId:  input.employeeId,
      type:        input.type,
      reason:      input.reason,
      description: input.description ?? null,
      issuedBy:    session.user.id,
      issuedAt:    new Date(input.issuedAt),
      expiresAt:   input.expiresAt ? new Date(input.expiresAt) : null,
      fileUrl:     input.fileUrl   ?? null,
    },
    include: { employee: { include: { user: { select: { id: true } } } } },
  });

  await createNotification({
    userId: record.employee.user.id,
    type:   "GENERAL",
    title:  `Disciplinary Notice — ${input.type}`,
    body:   `A disciplinary record (${input.type}) has been issued on your profile.`,
    link:   `/disciplinary`,
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId:         session.user.id,
    action:         "CREATE",
    entity:         "DisciplinaryRecord",
    entityId:       record.id,
    newValues:      { type: input.type, reason: input.reason },
  });

  revalidatePath("/[orgSlug]/disciplinary");
  return { success: true, data: record };
}

export async function getDisciplinaryRecords(input: {
  organizationId: string;
  employeeId?:    string;
}) {
  return prisma.disciplinaryRecord.findMany({
    where: {
      employee: { organizationId: input.organizationId },
      ...(input.employeeId ? { employeeId: input.employeeId } : {}),
    },
    include: {
      employee: { select: { firstName: true, lastName: true, employeeCode: true, avatar: true } },
    },
    orderBy: { issuedAt: "desc" },
  });
}

export async function deleteDisciplinaryRecord(recordId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  await prisma.disciplinaryRecord.delete({ where: { id: recordId } });
  revalidatePath("/[orgSlug]/disciplinary");
  return { success: true };
}

// ══════════════════════════════════════════════
// OFFICIAL LETTERS
// ══════════════════════════════════════════════

export async function createOfficialLetter(input: {
  employeeId:    string;
  organizationId: string;
  type:          OfficialLetterType;
  subject:       string;
  content:       string;
  fileUrl?:      string;
  publicId?:     string;
  issuedAt?:     string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const letter = await prisma.officialLetter.create({
    data: {
      employeeId: input.employeeId,
      type:       input.type,
      subject:    input.subject,
      content:    input.content,
      fileUrl:    input.fileUrl  ?? null,
      publicId:   input.publicId ?? null,
      issuedAt:   input.issuedAt ? new Date(input.issuedAt) : new Date(),
      issuedBy:   session.user.id,
    },
    include: { employee: { include: { user: { select: { id: true } } } } },
  });

  await createNotification({
    userId: letter.employee.user.id,
    type:   "GENERAL",
    title:  `New Letter — ${input.type.replace(/_/g, " ")}`,
    body:   `A new official letter (${input.subject}) has been issued to you.`,
    link:   `/letters`,
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId:         session.user.id,
    action:         "CREATE",
    entity:         "OfficialLetter",
    entityId:       letter.id,
    newValues:      { type: input.type, subject: input.subject },
  });

  revalidatePath("/[orgSlug]/letters");
  return { success: true, data: letter };
}

export async function getOfficialLetters(input: {
  organizationId: string;
  employeeId?:    string;
  type?:          OfficialLetterType;
}) {
  return prisma.officialLetter.findMany({
    where: {
      employee: { organizationId: input.organizationId },
      ...(input.employeeId ? { employeeId: input.employeeId } : {}),
      ...(input.type       ? { type: input.type }             : {}),
    },
    include: {
      employee: { select: { firstName: true, lastName: true, employeeCode: true, avatar: true } },
    },
    orderBy: { issuedAt: "desc" },
  });
}

export async function deleteOfficialLetter(letterId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  await prisma.officialLetter.delete({ where: { id: letterId } });
  revalidatePath("/[orgSlug]/letters");
  return { success: true };
}
