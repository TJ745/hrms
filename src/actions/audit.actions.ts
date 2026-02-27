"use server";

import { prisma } from "@/lib/prisma";

type AuditLogParams = {
  organizationId: string;
  userId?:        string;
  action:         string; // CREATE | UPDATE | DELETE | LOGIN | EXPORT | APPROVE | REJECT
  entity:         string; // "Employee" | "Payroll" etc.
  entityId?:      string;
  oldValues?:     Record<string, unknown>;
  newValues?:     Record<string, unknown>;
  ipAddress?:     string;
  userAgent?:     string;
};

export async function createAuditLog(params: AuditLogParams) {
  try {
    await prisma.auditLog.create({ data: params });
  } catch {
    // Audit log should never crash the main action
    console.error("[AuditLog] Failed to write:", params);
  }
}
