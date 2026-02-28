"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/actions/audit.actions";

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

// ── Organization Settings ─────────────────────────────────────

export async function updateOrganizationSettings(input: {
  organizationId:  string;
  name?:           string;
  email?:          string;
  phone?:          string;
  website?:        string;
  address?:        string;
  city?:           string;
  country?:        string;
  timezone?:       string;
  dateFormat?:     string;
  defaultCurrency?: string;
  defaultLanguage?: string;
  fiscalYearStart?: number;
  industry?:       string;
  companySize?:    string;
  registrationNumber?: string;
  taxId?:          string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    const org = await prisma.organization.update({
      where: { id: input.organizationId },
      data: {
        ...(input.name             !== undefined ? { name:             input.name }             : {}),
        ...(input.email            !== undefined ? { email:            input.email }            : {}),
        ...(input.phone            !== undefined ? { phone:            input.phone }            : {}),
        ...(input.website          !== undefined ? { website:          input.website }          : {}),
        ...(input.address          !== undefined ? { address:          input.address }          : {}),
        ...(input.city             !== undefined ? { city:             input.city }             : {}),
        ...(input.country          !== undefined ? { country:          input.country }          : {}),
        ...(input.timezone         !== undefined ? { timezone:         input.timezone }         : {}),
        ...(input.dateFormat       !== undefined ? { dateFormat:       input.dateFormat }       : {}),
        ...(input.defaultCurrency  !== undefined ? { defaultCurrency:  input.defaultCurrency }  : {}),
        ...(input.defaultLanguage  !== undefined ? { defaultLanguage:  input.defaultLanguage }  : {}),
        ...(input.fiscalYearStart  !== undefined ? { fiscalYearStart:  input.fiscalYearStart }  : {}),
        ...(input.industry         !== undefined ? { industry:         input.industry }         : {}),
        ...(input.companySize      !== undefined ? { companySize:      input.companySize }      : {}),
        ...(input.registrationNumber !== undefined ? { registrationNumber: input.registrationNumber } : {}),
        ...(input.taxId            !== undefined ? { taxId:            input.taxId }            : {}),
      },
    });

    await createAuditLog({
      organizationId: input.organizationId,
      userId:         session.user.id,
      action:         "UPDATE",
      entity:         "Organization",
      entityId:       input.organizationId,
      newValues:      { updated: Object.keys(input).filter(k => k !== "organizationId") },
    });

    revalidatePath("/[orgSlug]/settings", "page");
    return { success: true, data: org };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update settings" };
  }
}

export async function updatePayrollSettings(input: {
  organizationId: string;
  currency:       string;
  payDay:         number;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  await prisma.payrollSettings.upsert({
    where:  { organizationId: input.organizationId },
    create: { organizationId: input.organizationId, currency: input.currency, payDay: input.payDay },
    update: { currency: input.currency, payDay: input.payDay },
  });

  revalidatePath("/[orgSlug]/settings", "page");
  return { success: true };
}

// ── User Profile ──────────────────────────────────────────────

export async function updateUserProfile(input: {
  userId:           string;
  name?:            string;
  preferredLanguage?: string;
  timezone?:        string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  await prisma.user.update({
    where: { id: input.userId },
    data: {
      ...(input.name              !== undefined ? { name:              input.name }              : {}),
      ...(input.preferredLanguage !== undefined ? { preferredLanguage: input.preferredLanguage } : {}),
      ...(input.timezone          !== undefined ? { timezone:          input.timezone }          : {}),
    },
  });

  revalidatePath("/[orgSlug]/profile", "page");
  return { success: true };
}

export async function updateEmployeeProfile(input: {
  employeeId:     string;
  organizationId: string;
  phone?:         string;
  personalEmail?: string;
  address?:       string;
  city?:          string;
  country?:       string;
  linkedinUrl?:   string;
  bloodGroup?:    string;
  dateOfBirth?:   string;
  maritalStatus?: string;
  nationality?:   string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  await prisma.employee.update({
    where: { id: input.employeeId },
    data: {
      ...(input.phone         !== undefined ? { phone:         input.phone }         : {}),
      ...(input.personalEmail !== undefined ? { personalEmail: input.personalEmail } : {}),
      ...(input.address       !== undefined ? { address:       input.address }       : {}),
      ...(input.city          !== undefined ? { city:          input.city }          : {}),
      ...(input.country       !== undefined ? { country:       input.country }       : {}),
      ...(input.linkedinUrl   !== undefined ? { linkedinUrl:   input.linkedinUrl }   : {}),
      ...(input.bloodGroup    !== undefined ? { bloodGroup:    input.bloodGroup }    : {}),
      ...(input.dateOfBirth   !== undefined ? { dateOfBirth:   new Date(input.dateOfBirth) } : {}),
      ...(input.maritalStatus !== undefined ? { maritalStatus: input.maritalStatus as any } : {}),
      ...(input.nationality   !== undefined ? { nationality:   input.nationality }   : {}),
    },
  });

  revalidatePath("/[orgSlug]/profile", "page");
  return { success: true };
}

export async function changePassword(input: {
  userId:          string;
  currentPassword: string;
  newPassword:     string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  // Use BetterAuth's built-in password change
  try {
    await auth.api.changePassword({
      body: {
        currentPassword: input.currentPassword,
        newPassword:     input.newPassword,
        revokeOtherSessions: false,
      },
      headers: await headers(),
    });

    // Store in password history
    await prisma.passwordHistory.create({
      data: { userId: input.userId, password: "[hashed_by_betterauth]" },
    });

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to change password" };
  }
}

// ── Branches ──────────────────────────────────────────────────

export async function createBranch(input: {
  organizationId: string;
  name:           string;
  code?:          string;
  address?:       string;
  city?:          string;
  country?:       string;
  timezone?:      string;
  phone?:         string;
  email?:         string;
  isHeadquarters?: boolean;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const branch = await prisma.branch.create({
    data: {
      organizationId: input.organizationId,
      name:           input.name,
      code:           input.code           || null,
      address:        input.address        || null,
      city:           input.city           || null,
      country:        input.country        || null,
      timezone:       input.timezone       || null,
      phone:          input.phone          || null,
      email:          input.email          || null,
      isHeadquarters: input.isHeadquarters || false,
    },
  });

  revalidatePath("/[orgSlug]/settings", "page");
  return { success: true, data: branch };
}

export async function createDepartment(input: {
  organizationId: string;
  branchId?:      string;
  name:           string;
  code?:          string;
  description?:   string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const dept = await prisma.department.create({
    data: {
      organizationId: input.organizationId,
      branchId:       input.branchId    || null,
      name:           input.name,
      code:           input.code        || null,
      description:    input.description || null,
    },
  });

  revalidatePath("/[orgSlug]/settings", "page");
  return { success: true, data: dept };
}

export async function createPosition(input: {
  organizationId: string;
  departmentId?:  string;
  title:          string;
  code?:          string;
  description?:   string;
  minSalary?:     number;
  maxSalary?:     number;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const position = await prisma.position.create({
    data: {
      organizationId: input.organizationId,
      departmentId:   input.departmentId || null,
      title:          input.title,
      code:           input.code        || null,
      description:    input.description || null,
      minSalary:      input.minSalary   || null,
      maxSalary:      input.maxSalary   || null,
    },
  });

  revalidatePath("/[orgSlug]/settings", "page");
  return { success: true, data: position };
}

// ── Leave Types ───────────────────────────────────────────────

export async function createLeaveType(input: {
  organizationId:  string;
  name:            string;
  category:        string;
  daysAllowed:     number;
  carryForward?:   boolean;
  maxCarryForward?: number;
  isPaid?:         boolean;
  requiresApproval?: boolean;
  allowHalfDay?:   boolean;
  color?:          string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const lt = await prisma.leaveType.create({
    data: {
      organizationId:   input.organizationId,
      name:             input.name,
      category:         input.category as any,
      daysAllowed:      input.daysAllowed,
      carryForward:     input.carryForward     ?? false,
      maxCarryForward:  input.maxCarryForward  ?? null,
      isPaid:           input.isPaid           ?? true,
      requiresApproval: input.requiresApproval ?? true,
      allowHalfDay:     input.allowHalfDay     ?? true,
      color:            input.color            || null,
    },
  });

  revalidatePath("/[orgSlug]/settings", "page");
  return { success: true, data: lt };
}

export async function toggleLeaveTypeActive(id: string, isActive: boolean) {
  const session = await getSession();
  if (!session) return { success: false };

  await prisma.leaveType.update({ where: { id }, data: { isActive } });
  revalidatePath("/[orgSlug]/settings", "page");
  return { success: true };
}