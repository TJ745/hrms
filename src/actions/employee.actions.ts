"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { createAuditLog } from "@/actions/audit.actions";
import { generateEmployeeCode } from "@/lib/utils";
import type {
  EmploymentType,
  EmploymentStatus,
  Gender,
  MaritalStatus,
} from "@prisma/client";

// ── Types ────────────────────────────────────────────────────

export type CreateEmployeeInput = {
  // Personal
  firstName:       string;
  lastName:        string;
  middleName?:     string;
  dateOfBirth?:    string;
  gender?:         Gender;
  maritalStatus?:  MaritalStatus;
  bloodGroup?:     string;
  nationality?:    string;
  nationalId?:     string;
  passportNumber?: string;
  passportExpiry?: string;
  visaType?:       string;
  visaExpiryDate?: string;
  phone?:          string;
  personalEmail?:  string;
  address?:        string;
  city?:           string;
  country?:        string;
  linkedinUrl?:    string;

  // Employment
  branchId:        string;
  departmentId?:   string;
  positionId?:     string;
  managerId?:      string;
  workScheduleId?: string;
  hireDate:        string;
  probationEndDate?: string;
  employmentType:  EmploymentType;
  noticePeriod?:   number;

  // Account
  email:           string;
  password:        string;
};

export type UpdateEmployeeInput = Partial<CreateEmployeeInput> & {
  status?: EmploymentStatus;
  avatar?: string;
};

// ── Helpers ──────────────────────────────────────────────────

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

async function getOrgId(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true, branchId: true, systemRole: true },
  });
  return user;
}

// ── Create Employee ──────────────────────────────────────────

export async function createEmployee(input: CreateEmployeeInput) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const actor = await getOrgId(session.user.id);
  if (!actor?.organizationId) return { success: false, error: "No organization" };

  try {
    // Count existing employees for code generation
    const count = await prisma.employee.count({
      where: { organizationId: actor.organizationId },
    });

    const employeeCode = generateEmployeeCode("EMP", count + 1);

    // Hash password with argon2
    const argon2 = await import("argon2");
    const hashedPassword = await argon2.hash(input.password);

    const result = await prisma.$transaction(async (tx) => {
      // Create user account
      const user = await tx.user.create({
        data: {
          name:           `${input.firstName} ${input.lastName}`,
          email:          input.email,
          organizationId: actor.organizationId!,
          branchId:       input.branchId,
          systemRole:     "EMPLOYEE",
        },
      });

      // Create account with password
      await tx.account.create({
        data: {
          userId:     user.id,
          accountId:  user.id,
          providerId: "credential",
          password:   hashedPassword,
        },
      });

      // Create employee record
      const employee = await tx.employee.create({
        data: {
          organizationId:   actor.organizationId!,
          userId:           user.id,
          branchId:         input.branchId,
          departmentId:     input.departmentId || null,
          positionId:       input.positionId   || null,
          managerId:        input.managerId    || null,
          workScheduleId:   input.workScheduleId || null,
          employeeCode,
          firstName:        input.firstName,
          lastName:         input.lastName,
          middleName:       input.middleName    || null,
          dateOfBirth:      input.dateOfBirth   ? new Date(input.dateOfBirth) : null,
          gender:           input.gender        || null,
          maritalStatus:    input.maritalStatus || null,
          bloodGroup:       input.bloodGroup    || null,
          nationality:      input.nationality   || null,
          nationalId:       input.nationalId    || null,
          passportNumber:   input.passportNumber || null,
          passportExpiry:   input.passportExpiry ? new Date(input.passportExpiry) : null,
          visaType:         input.visaType       || null,
          visaExpiryDate:   input.visaExpiryDate ? new Date(input.visaExpiryDate) : null,
          phone:            input.phone          || null,
          personalEmail:    input.personalEmail  || null,
          address:          input.address        || null,
          city:             input.city           || null,
          country:          input.country        || null,
          linkedinUrl:      input.linkedinUrl    || null,
          hireDate:         new Date(input.hireDate),
          probationEndDate: input.probationEndDate ? new Date(input.probationEndDate) : null,
          employmentType:   input.employmentType,
          noticePeriod:     input.noticePeriod   || null,
          status:           "ACTIVE",
        },
      });

      return employee;
    });

    await createAuditLog({
      organizationId: actor.organizationId,
      userId:         session.user.id,
      action:         "CREATE",
      entity:         "Employee",
      entityId:       result.id,
      newValues:      { employeeCode, name: `${input.firstName} ${input.lastName}` },
    });

    revalidatePath(`/[orgSlug]/employees`, "page");
    return { success: true, data: result };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create employee";
    if (message.includes("Unique constraint") && message.includes("email")) {
      return { success: false, error: "An account with this email already exists" };
    }
    return { success: false, error: message };
  }
}

// ── Get Employees ────────────────────────────────────────────

export async function getEmployees(params: {
  organizationId: string;
  branchId?:      string;
  search?:        string;
  status?:        EmploymentStatus;
  departmentId?:  string;
  page?:          number;
  perPage?:       number;
}) {
  const { organizationId, branchId, search, status, departmentId, page = 1, perPage = 20 } = params;

  const where = {
    organizationId,
    ...(branchId     ? { branchId }     : {}),
    ...(status       ? { status }        : {}),
    ...(departmentId ? { departmentId }  : {}),
    ...(search ? {
      OR: [
        { firstName:    { contains: search, mode: "insensitive" as const } },
        { lastName:     { contains: search, mode: "insensitive" as const } },
        { employeeCode: { contains: search, mode: "insensitive" as const } },
        { phone:        { contains: search, mode: "insensitive" as const } },
        { user: { email: { contains: search, mode: "insensitive" as const } } },
      ],
    } : {}),
  };

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      include: {
        user:       { select: { email: true } },
        branch:     { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        position:   { select: { id: true, title: true } },
        manager:    { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip:  (page - 1) * perPage,
      take:  perPage,
    }),
    prisma.employee.count({ where }),
  ]);

  return {
    employees,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  };
}

// ── Get Single Employee ──────────────────────────────────────

export async function getEmployee(id: string, organizationId: string) {
  return prisma.employee.findFirst({
    where: { id, organizationId },
    include: {
      user:             { select: { email: true, emailVerified: true, lastLoginAt: true } },
      branch:           { select: { id: true, name: true } },
      department:       { select: { id: true, name: true } },
      position:         { select: { id: true, title: true } },
      manager:          { select: { id: true, firstName: true, lastName: true, avatar: true } },
      emergencyContacts: true,
      documents:        true,
      salaryHistory:    { orderBy: { effectiveDate: "desc" } },
      bankDetails:      true,
      contracts:        { orderBy: { createdAt: "desc" } },
      leaveBalances:    { include: { leaveType: true } },
      assets:           true,
    },
  });
}

// ── Update Employee ──────────────────────────────────────────

export async function updateEmployee(id: string, input: UpdateEmployeeInput) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const actor = await getOrgId(session.user.id);
  if (!actor?.organizationId) return { success: false, error: "No organization" };

  try {
    const old = await prisma.employee.findFirst({
      where: { id, organizationId: actor.organizationId },
    });
    if (!old) return { success: false, error: "Employee not found" };

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        ...(input.firstName       && { firstName: input.firstName }),
        ...(input.lastName        && { lastName: input.lastName }),
        ...(input.middleName      !== undefined && { middleName: input.middleName }),
        ...(input.phone           !== undefined && { phone: input.phone }),
        ...(input.personalEmail   !== undefined && { personalEmail: input.personalEmail }),
        ...(input.address         !== undefined && { address: input.address }),
        ...(input.city            !== undefined && { city: input.city }),
        ...(input.country         !== undefined && { country: input.country }),
        ...(input.gender          && { gender: input.gender }),
        ...(input.maritalStatus   && { maritalStatus: input.maritalStatus }),
        ...(input.bloodGroup      !== undefined && { bloodGroup: input.bloodGroup }),
        ...(input.nationality     !== undefined && { nationality: input.nationality }),
        ...(input.nationalId      !== undefined && { nationalId: input.nationalId }),
        ...(input.branchId        && { branchId: input.branchId }),
        ...(input.departmentId    !== undefined && { departmentId: input.departmentId }),
        ...(input.positionId      !== undefined && { positionId: input.positionId }),
        ...(input.managerId       !== undefined && { managerId: input.managerId }),
        ...(input.employmentType  && { employmentType: input.employmentType }),
        ...(input.status          && { status: input.status }),
        ...(input.avatar          && { avatar: input.avatar }),
        ...(input.noticePeriod    !== undefined && { noticePeriod: input.noticePeriod }),
        ...(input.visaType        !== undefined && { visaType: input.visaType }),
        ...(input.visaExpiryDate  && { visaExpiryDate: new Date(input.visaExpiryDate) }),
        ...(input.passportNumber  !== undefined && { passportNumber: input.passportNumber }),
        ...(input.passportExpiry  && { passportExpiry: new Date(input.passportExpiry) }),
        ...(input.linkedinUrl     !== undefined && { linkedinUrl: input.linkedinUrl }),
      },
    });

    await createAuditLog({
      organizationId: actor.organizationId,
      userId:         session.user.id,
      action:         "UPDATE",
      entity:         "Employee",
      entityId:       id,
      oldValues:      old as Record<string, unknown>,
      newValues:      input as Record<string, unknown>,
    });

    revalidatePath(`/[orgSlug]/employees`, "page");
    revalidatePath(`/[orgSlug]/employees/${id}`, "page");
    return { success: true, data: updated };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Update failed" };
  }
}

// ── Terminate Employee ───────────────────────────────────────

export async function terminateEmployee(id: string, reason: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const actor = await getOrgId(session.user.id);
  if (!actor?.organizationId) return { success: false, error: "No organization" };

  try {
    const updated = await prisma.employee.update({
      where: { id },
      data: {
        status:          "TERMINATED",
        terminationDate: new Date(),
      },
    });

    await createAuditLog({
      organizationId: actor.organizationId,
      userId:         session.user.id,
      action:         "TERMINATE",
      entity:         "Employee",
      entityId:       id,
      newValues:      { reason, terminationDate: new Date() },
    });

    revalidatePath(`/[orgSlug]/employees`, "page");
    return { success: true, data: updated };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed" };
  }
}

// ── Get Form Options ─────────────────────────────────────────

export async function getEmployeeFormOptions(organizationId: string) {
  const [branches, departments, positions, workSchedules, employees] = await Promise.all([
    prisma.branch.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, name: true },
    }),
    prisma.department.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, name: true, branchId: true },
    }),
    prisma.position.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, title: true, departmentId: true },
    }),
    prisma.workSchedule.findMany({
      where: { organizationId },
      select: { id: true, name: true },
    }),
    prisma.employee.findMany({
      where: { organizationId, status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
  ]);

  return { branches, departments, positions, workSchedules, employees };
}
