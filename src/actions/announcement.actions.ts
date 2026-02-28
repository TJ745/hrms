"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/actions/audit.actions";
import type { AnnouncementAudience } from "@prisma/client";

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function createAnnouncement(input: {
  organizationId: string;
  branchId?:      string;
  departmentId?:  string;
  audience:       AnnouncementAudience;
  title:          string;
  content:        string;
  isPinned?:      boolean;
  publishedAt?:   string;
  expiresAt?:     string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    const announcement = await prisma.announcement.create({
      data: {
        organizationId: input.organizationId,
        branchId:       input.branchId      || null,
        departmentId:   input.departmentId  || null,
        audience:       input.audience,
        title:          input.title,
        content:        input.content,
        isPinned:       input.isPinned      || false,
        publishedAt:    input.publishedAt ? new Date(input.publishedAt) : new Date(),
        expiresAt:      input.expiresAt   ? new Date(input.expiresAt)  : null,
        createdBy:      session.user.id,
      },
    });

    await createAuditLog({
      organizationId: input.organizationId,
      userId:         session.user.id,
      action:         "CREATE",
      entity:         "Announcement",
      entityId:       announcement.id,
      newValues:      { title: input.title, audience: input.audience },
    });

    revalidatePath("/[orgSlug]/announcements", "page");
    return { success: true, data: announcement };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create announcement" };
  }
}

export async function toggleAnnouncementPin(id: string, isPinned: boolean, organizationId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  await prisma.announcement.update({
    where: { id },
    data:  { isPinned },
  });

  revalidatePath("/[orgSlug]/announcements", "page");
  return { success: true };
}

export async function deleteAnnouncement(id: string, organizationId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  await prisma.announcement.delete({ where: { id } });

  await createAuditLog({
    organizationId,
    userId:  session.user.id,
    action:  "DELETE",
    entity:  "Announcement",
    entityId: id,
  });

  revalidatePath("/[orgSlug]/announcements", "page");
  return { success: true };
}

export async function getAnnouncements(params: {
  organizationId: string;
  branchId?:      string;
  departmentId?:  string;
  audience?:      AnnouncementAudience;
  pinned?:        boolean;
  page?:          number;
  perPage?:       number;
}) {
  const { organizationId, branchId, departmentId, audience, pinned, page = 1, perPage = 20 } = params;

  const now = new Date();
  const where = {
    organizationId,
    publishedAt: { lte: now },
    OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
    ...(branchId     ? { OR: [{ branchId }, { audience: "ALL" as AnnouncementAudience }] } : {}),
    ...(departmentId ? { OR: [{ departmentId }, { audience: "ALL" as AnnouncementAudience }] } : {}),
    ...(audience     ? { audience }    : {}),
    ...(pinned !== undefined ? { isPinned: pinned } : {}),
  };

  const [announcements, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
      skip:    (page - 1) * perPage,
      take:    perPage,
    }),
    prisma.announcement.count({ where }),
  ]);

  return { announcements, total, page, perPage, totalPages: Math.ceil(total / perPage) };
}

export async function getAnnouncementsForEmployee(params: {
  organizationId: string;
  branchId?:      string;
  departmentId?:  string;
  page?:          number;
  perPage?:       number;
}) {
  const { organizationId, branchId, departmentId, page = 1, perPage = 20 } = params;
  const now = new Date();

  // Employee sees: ALL audience + their branch + their department
  const where = {
    organizationId,
    publishedAt: { lte: now },
    OR: [
      { expiresAt: null },
      { expiresAt: { gte: now } },
    ],
    AND: [{
      OR: [
        { audience: "ALL" as AnnouncementAudience },
        ...(branchId     ? [{ audience: "BRANCH" as AnnouncementAudience,      branchId }]     : []),
        ...(departmentId ? [{ audience: "DEPARTMENT" as AnnouncementAudience, departmentId }] : []),
      ],
    }],
  };

  const [announcements, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
      skip:    (page - 1) * perPage,
      take:    perPage,
    }),
    prisma.announcement.count({ where }),
  ]);

  return { announcements, total, page, perPage, totalPages: Math.ceil(total / perPage) };
}
