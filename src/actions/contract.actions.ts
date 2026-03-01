"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/actions/audit.actions";
import { createNotification } from "@/actions/notification.actions";
import type { ContractType, ContractStatus } from "@prisma/client";

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function createContract(input: {
  employeeId:   string;
  organizationId: string;
  type:         ContractType;
  startDate:    string;
  endDate?:     string;
  fileUrl?:     string;
  publicId?:    string;
  autoRenew?:   boolean;
  reminderDays?: number;
  notes?:       string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const contract = await prisma.contract.create({
    data: {
      employeeId:  input.employeeId,
      type:        input.type,
      startDate:   new Date(input.startDate),
      endDate:     input.endDate    ? new Date(input.endDate) : null,
      fileUrl:     input.fileUrl    ?? null,
      publicId:    input.publicId   ?? null,
      autoRenew:   input.autoRenew  ?? false,
      reminderDays: input.reminderDays ?? 30,
      notes:       input.notes      ?? null,
      status:      "ACTIVE",
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId:         session.user.id,
    action:         "CREATE",
    entity:         "Contract",
    entityId:       contract.id,
    newValues:      { type: input.type, startDate: input.startDate },
  });

  revalidatePath("/[orgSlug]/contracts");
  return { success: true, data: contract };
}

export async function updateContractStatus(input: {
  contractId:     string;
  status:         ContractStatus;
  organizationId: string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const contract = await prisma.contract.update({
    where: { id: input.contractId },
    data:  { status: input.status },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId:         session.user.id,
    action:         "UPDATE",
    entity:         "Contract",
    entityId:       input.contractId,
    newValues:      { status: input.status },
  });

  revalidatePath("/[orgSlug]/contracts");
  return { success: true, data: contract };
}

export async function getContracts(input: {
  organizationId: string;
  employeeId?:    string;
  status?:        ContractStatus;
  expiringInDays?: number;
}) {
  const where: any = {
    employee: { organizationId: input.organizationId },
    ...(input.employeeId ? { employeeId: input.employeeId } : {}),
    ...(input.status     ? { status: input.status }         : {}),
  };

  if (input.expiringInDays) {
    const cutoff = new Date(Date.now() + input.expiringInDays * 86400000);
    where.endDate = { gte: new Date(), lte: cutoff };
    where.status  = "ACTIVE";
  }

  const contracts = await prisma.contract.findMany({
    where,
    include: {
      employee: {
        select: {
          firstName: true, lastName: true, employeeCode: true, avatar: true,
          department: { select: { name: true } },
          position:   { select: { title: true } },
        },
      },
    },
    orderBy: [{ status: "asc" }, { endDate: "asc" }],
  });

  return contracts;
}

export async function getContractStats(organizationId: string) {
  const today  = new Date();
  const in30   = new Date(Date.now() + 30 * 86400000);

  const [active, expiring, expired] = await Promise.all([
    prisma.contract.count({ where: { employee: { organizationId }, status: "ACTIVE" } }),
    prisma.contract.count({ where: { employee: { organizationId }, status: "ACTIVE", endDate: { gte: today, lte: in30 } } }),
    prisma.contract.count({ where: { employee: { organizationId }, status: "EXPIRED" } }),
  ]);

  return { active, expiring, expired };
}

export async function deleteContract(contractId: string, organizationId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  await prisma.contract.delete({ where: { id: contractId } });
  revalidatePath("/[orgSlug]/contracts");
  return { success: true };
}
