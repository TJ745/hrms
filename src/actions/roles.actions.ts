"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/actions/audit.actions";

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function getRoles(organizationId: string) {
  return prisma.role.findMany({
    where: {
      OR: [
        { organizationId },
        { isSystem: true },
      ],
    },
    include: {
      _count: { select: { userRoles: true } },
    },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });
}

export async function createRole(input: {
  organizationId: string;
  name:           string;
  description?:   string;
  permissions:    string[];
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    const role = await prisma.role.create({
      data: {
        organizationId: input.organizationId,
        name:           input.name,
        description:    input.description || null,
        permissions:    input.permissions,
        isSystem:       false,
      },
    });

    await createAuditLog({
      organizationId: input.organizationId,
      userId:         session.user.id,
      action:         "CREATE",
      entity:         "Role",
      entityId:       role.id,
      newValues:      { name: input.name, permissions: input.permissions },
    });

    revalidatePath("/[orgSlug]/settings/roles", "page");
    return { success: true, data: role };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create role" };
  }
}

export async function updateRole(input: {
  roleId:         string;
  organizationId: string;
  name?:          string;
  description?:   string;
  permissions?:   string[];
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const role = await prisma.role.findUnique({ where: { id: input.roleId } });
  if (!role || role.isSystem) return { success: false, error: "Cannot edit system roles" };

  await prisma.role.update({
    where: { id: input.roleId },
    data: {
      ...(input.name        !== undefined ? { name:        input.name }        : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.permissions !== undefined ? { permissions: input.permissions } : {}),
    },
  });

  revalidatePath("/[orgSlug]/settings/roles", "page");
  return { success: true };
}

export async function deleteRole(roleId: string, organizationId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role || role.isSystem) return { success: false, error: "Cannot delete system roles" };

  await prisma.role.delete({ where: { id: roleId } });

  await createAuditLog({
    organizationId,
    userId:  session.user.id,
    action:  "DELETE",
    entity:  "Role",
    entityId: roleId,
  });

  revalidatePath("/[orgSlug]/settings/roles", "page");
  return { success: true };
}

export async function assignRoleToUser(input: {
  userId:         string;
  roleId:         string;
  organizationId: string;
  branchId?:      string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  await prisma.userRoleAssignment.upsert({
    where: {
      userId_roleId_branchId: {
        userId:   input.userId,
        roleId:   input.roleId,
        branchId: input.branchId ?? null,
      },
    },
    create: {
      userId:   input.userId,
      roleId:   input.roleId,
      branchId: input.branchId ?? null,
    },
    update: {},
  });

  revalidatePath("/[orgSlug]/settings/roles", "page");
  return { success: true };
}

export async function removeRoleFromUser(assignmentId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  await prisma.userRoleAssignment.delete({ where: { id: assignmentId } });
  revalidatePath("/[orgSlug]/settings/roles", "page");
  return { success: true };
}
