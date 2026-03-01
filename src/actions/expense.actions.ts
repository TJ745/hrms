"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/actions/audit.actions";
import { createNotification } from "@/actions/notification.actions";
import type { ExpenseCategory, ExpenseStatus } from "@prisma/client";

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function createExpenseClaim(input: {
  employeeId:   string;
  title:        string;
  amount:       number;
  currency?:    string;
  category:     ExpenseCategory;
  expenseDate:  string;
  receiptUrl?:  string;
  publicId?:    string;
  description?: string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const claim = await prisma.expenseClaim.create({
    data: {
      employeeId:  input.employeeId,
      title:       input.title,
      amount:      input.amount,
      currency:    input.currency ?? "USD",
      category:    input.category,
      expenseDate: new Date(input.expenseDate),
      receiptUrl:  input.receiptUrl  ?? null,
      publicId:    input.publicId    ?? null,
      description: input.description ?? null,
      status:      "PENDING",
    },
    include: { employee: { select: { organizationId: true, firstName: true, lastName: true } } },
  });

  await createAuditLog({
    organizationId: claim.employee.organizationId,
    userId:         session.user.id,
    action:         "CREATE",
    entity:         "ExpenseClaim",
    entityId:       claim.id,
    newValues:      { title: input.title, amount: input.amount, category: input.category },
  });

  revalidatePath("/[orgSlug]/expenses");
  return { success: true, data: claim };
}

export async function updateExpenseStatus(input: {
  claimId:        string;
  status:         ExpenseStatus;
  rejectedReason?: string;
  organizationId: string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const claim = await prisma.expenseClaim.update({
    where: { id: input.claimId },
    data: {
      status:         input.status,
      approvedBy:     input.status === "APPROVED" || input.status === "PAID" ? session.user.id : undefined,
      approvedAt:     input.status === "APPROVED" ? new Date() : undefined,
      paidAt:         input.status === "PAID"     ? new Date() : undefined,
      rejectedReason: input.rejectedReason        ?? null,
    },
    include: { employee: { include: { user: { select: { id: true } } } } },
  });

  // Notify employee
  const notifType = input.status === "APPROVED" ? "GENERAL" : input.status === "REJECTED" ? "GENERAL" : "GENERAL";
  const statusMsg = input.status === "APPROVED" ? "approved" : input.status === "REJECTED" ? "rejected" : "paid";
  await createNotification({
    userId: claim.employee.user.id,
    type:   notifType,
    title:  `Expense Claim ${statusMsg.charAt(0).toUpperCase() + statusMsg.slice(1)}`,
    body:   `Your expense claim "${claim.title}" has been ${statusMsg}.`,
    link:   `/expenses`,
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId:         session.user.id,
    action:         "UPDATE",
    entity:         "ExpenseClaim",
    entityId:       input.claimId,
    newValues:      { status: input.status },
  });

  revalidatePath("/[orgSlug]/expenses");
  return { success: true, data: claim };
}

export async function deleteExpenseClaim(claimId: string, organizationId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  await prisma.expenseClaim.delete({ where: { id: claimId } });
  revalidatePath("/[orgSlug]/expenses");
  return { success: true };
}

export async function getExpenseClaims(input: {
  organizationId: string;
  employeeId?:    string;
  status?:        ExpenseStatus;
  category?:      ExpenseCategory;
  page?:          number;
  limit?:         number;
}) {
  const page  = input.page  ?? 1;
  const limit = input.limit ?? 20;
  const skip  = (page - 1) * limit;

  const where: any = {
    employee: { organizationId: input.organizationId },
    ...(input.employeeId ? { employeeId: input.employeeId } : {}),
    ...(input.status     ? { status: input.status }         : {}),
    ...(input.category   ? { category: input.category }     : {}),
  };

  const [claims, total] = await Promise.all([
    prisma.expenseClaim.findMany({
      where,
      include: {
        employee: { select: { firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.expenseClaim.count({ where }),
  ]);

  return { claims, total, pages: Math.ceil(total / limit) };
}

export async function getExpenseSummary(organizationId: string) {
  const [pending, approved, paid, totalAmount] = await Promise.all([
    prisma.expenseClaim.count({ where: { employee: { organizationId }, status: "PENDING" } }),
    prisma.expenseClaim.count({ where: { employee: { organizationId }, status: "APPROVED" } }),
    prisma.expenseClaim.count({ where: { employee: { organizationId }, status: "PAID" } }),
    prisma.expenseClaim.aggregate({
      where:  { employee: { organizationId }, status: { in: ["APPROVED", "PAID"] } },
      _sum:   { amount: true },
    }),
  ]);
  return { pending, approved, paid, totalApprovedAmount: totalAmount._sum.amount ?? 0 };
}
