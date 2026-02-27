"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { slugify } from "@/lib/utils";
import { createAuditLog } from "@/actions/audit.actions";
import { revalidatePath } from "next/cache";

export async function createOrganization(input: {
  name:     string;
  slug?:    string;
  email?:   string;
  phone?:   string;
  website?: string;
  country?: string;
  timezone?: string;
  industry?: string;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Unauthorized" };

  const slug = input.slug || slugify(input.name);

  // Check slug is unique
  const existing = await prisma.organization.findUnique({ where: { slug } });
  if (existing) return { success: false, error: "This URL slug is already taken. Please choose another." };

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Create organization
      const org = await tx.organization.create({
        data: {
          name:     input.name,
          slug,
          email:    input.email || session.user.email,
          phone:    input.phone    || null,
          website:  input.website  || null,
          country:  input.country  || null,
          timezone: input.timezone || "UTC",
          industry: input.industry || null,
          plan:     "FREE",
          status:   "ACTIVE",
        },
      });

      // Create default HQ branch
      const branch = await tx.branch.create({
        data: {
          organizationId: org.id,
          name:           "Headquarters",
          code:           "HQ",
          isHeadquarters: true,
          isActive:       true,
        },
      });

      // Create default work schedule
      await tx.workSchedule.create({
        data: {
          organizationId: org.id,
          name:           "Standard (Mon-Fri)",
          workDays:       [1, 2, 3, 4, 5],
          startTime:      "09:00",
          endTime:        "18:00",
          breakDuration:  60,
          isDefault:      true,
        },
      });

      // Create default leave types
      await tx.leaveType.createMany({
        data: [
          { organizationId: org.id, name: "Annual Leave",    category: "ANNUAL",    daysAllowed: 21, isPaid: true,  carryForward: true,  maxCarryForward: 5,  color: "#3b82f6" },
          { organizationId: org.id, name: "Sick Leave",      category: "SICK",      daysAllowed: 10, isPaid: true,  carryForward: false, color: "#ef4444" },
          { organizationId: org.id, name: "Unpaid Leave",    category: "UNPAID",    daysAllowed: 30, isPaid: false, carryForward: false, color: "#94a3b8" },
          { organizationId: org.id, name: "Emergency Leave", category: "EMERGENCY", daysAllowed: 3,  isPaid: true,  carryForward: false, color: "#f59e0b" },
        ],
      });

      // Promote current user to ORG_ADMIN and link to org
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          organizationId: org.id,
          branchId:       branch.id,
          systemRole:     "ORG_ADMIN",
        },
      });

      return { org, branch };
    });

    await createAuditLog({
      organizationId: result.org.id,
      userId:         session.user.id,
      action:         "CREATE",
      entity:         "Organization",
      entityId:       result.org.id,
      newValues:      { name: input.name, slug },
    });

    revalidatePath("/select-org");
    return { success: true, data: result };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create organization",
    };
  }
}

export async function getUserOrganization(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      organization: {
        select: {
          id: true, name: true, slug: true, logo: true,
          plan: true, status: true,
          _count: { select: { employees: true, branches: true } },
        },
      },
    },
  });
}