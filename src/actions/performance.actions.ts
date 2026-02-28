"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/actions/audit.actions";
import { createNotification } from "@/actions/notification.actions";
import type { ReviewStatus, GoalStatus } from "@prisma/client";

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

// ── Performance Reviews ──────────────────────────────────────

export async function createPerformanceReview(input: {
  organizationId: string;
  employeeId:     string;
  reviewerId:     string;
  period:         string; // e.g. "Q1 2025" or "2025"
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    // Prevent duplicate review for same employee + period
    const existing = await prisma.performanceReview.findFirst({
      where: { employeeId: input.employeeId, period: input.period },
    });
    if (existing) return { success: false, error: "A review for this employee and period already exists" };

    const review = await prisma.performanceReview.create({
      data: {
        employeeId: input.employeeId,
        reviewerId:  input.reviewerId,
        period:      input.period,
        status:      "DRAFT",
      },
    });

    // Notify the employee
    const reviewer = await prisma.employee.findUnique({
      where:  { id: input.reviewerId },
      select: { user: { select: { id: true, name: true } } },
    });
    const employee = await prisma.employee.findUnique({
      where:  { id: input.employeeId },
      select: { userId: true },
    });
    if (employee) {
      await createNotification({
        userId: employee.userId,
        type:   "PERFORMANCE_REVIEW",
        title:  "Performance Review Started",
        body:   `Your ${input.period} performance review has been initiated.`,
        link:   `/performance/reviews/${review.id}`,
      });
    }

    await createAuditLog({
      organizationId: input.organizationId,
      userId:         session.user.id,
      action:         "CREATE",
      entity:         "PerformanceReview",
      entityId:       review.id,
      newValues:      { employeeId: input.employeeId, period: input.period },
    });

    revalidatePath("/[orgSlug]/performance", "page");
    return { success: true, data: review };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create review" };
  }
}

export async function updatePerformanceReview(input: {
  reviewId:       string;
  organizationId: string;
  rating?:        number;
  strengths?:     string;
  improvements?:  string;
  comments?:      string;
  status?:        ReviewStatus;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const review = await prisma.performanceReview.update({
    where: { id: input.reviewId },
    data: {
      ...(input.rating       !== undefined ? { rating:       input.rating }       : {}),
      ...(input.strengths    !== undefined ? { strengths:    input.strengths }    : {}),
      ...(input.improvements !== undefined ? { improvements: input.improvements } : {}),
      ...(input.comments     !== undefined ? { comments:     input.comments }     : {}),
      ...(input.status       !== undefined ? { status:       input.status }       : {}),
      ...(input.status === "COMPLETED" ? { submittedAt: new Date() } : {}),
    },
    include: {
      employee: { select: { userId: true, firstName: true, lastName: true } },
    },
  });

  if (input.status === "COMPLETED") {
    await createNotification({
      userId: review.employee.userId,
      type:   "PERFORMANCE_REVIEW",
      title:  "Performance Review Completed",
      body:   `Your performance review has been completed with rating ${input.rating}/5.`,
      link:   `/performance/reviews/${input.reviewId}`,
    });
  }

  await createAuditLog({
    organizationId: input.organizationId,
    userId:         session.user.id,
    action:         "UPDATE",
    entity:         "PerformanceReview",
    entityId:       input.reviewId,
    newValues:      { status: input.status, rating: input.rating },
  });

  revalidatePath("/[orgSlug]/performance", "page");
  return { success: true, data: review };
}

export async function getPerformanceReviews(params: {
  organizationId: string;
  employeeId?:    string;
  reviewerId?:    string;
  period?:        string;
  status?:        ReviewStatus;
  page?:          number;
  perPage?:       number;
}) {
  const { organizationId, employeeId, reviewerId, period, status, page = 1, perPage = 20 } = params;

  const where = {
    employee: { organizationId },
    ...(employeeId ? { employeeId } : {}),
    ...(reviewerId ? { reviewerId } : {}),
    ...(period     ? { period }     : {}),
    ...(status     ? { status }     : {}),
  };

  const [reviews, total] = await Promise.all([
    prisma.performanceReview.findMany({
      where,
      include: {
        employee: {
          select: {
            id:         true,
            firstName:  true,
            lastName:   true,
            avatar:     true,
            employeeCode: true,
            position:   { select: { title: true } },
            department: { select: { name:  true } },
          },
        },
        reviewer: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: { select: { goals: true, feedback: true } },
      },
      orderBy: { createdAt: "desc" },
      skip:    (page - 1) * perPage,
      take:    perPage,
    }),
    prisma.performanceReview.count({ where }),
  ]);

  return { reviews, total, page, perPage, totalPages: Math.ceil(total / perPage) };
}

export async function getPerformanceReview(id: string, organizationId: string) {
  return prisma.performanceReview.findFirst({
    where: { id, employee: { organizationId } },
    include: {
      employee: {
        select: {
          id:           true,
          firstName:    true,
          lastName:     true,
          avatar:       true,
          employeeCode: true,
          position:     { select: { title: true } },
          department:   { select: { name: true } },
          branch:       { select: { name: true } },
        },
      },
      reviewer: {
        select: { id: true, firstName: true, lastName: true },
      },
      goals:    { orderBy: { createdAt: "asc" } },
      feedback: {
        include: {
          giver: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

// ── Goals ────────────────────────────────────────────────────

export async function createGoal(input: {
  employeeId:    string;
  reviewId?:     string;
  organizationId: string;
  title:         string;
  description?:  string;
  dueDate?:      string;
  kpiTarget?:    number;
  kpiUnit?:      string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const goal = await prisma.goal.create({
    data: {
      employeeId:  input.employeeId,
      reviewId:    input.reviewId   ?? null,
      title:       input.title,
      description: input.description ?? null,
      dueDate:     input.dueDate ? new Date(input.dueDate) : null,
      kpiTarget:   input.kpiTarget  ?? null,
      kpiUnit:     input.kpiUnit    ?? null,
      status:      "NOT_STARTED",
      progress:    0,
    },
  });

  revalidatePath("/[orgSlug]/performance", "page");
  return { success: true, data: goal };
}

export async function updateGoal(input: {
  goalId:        string;
  organizationId: string;
  title?:        string;
  description?:  string;
  status?:       GoalStatus;
  progress?:     number;
  kpiActual?:    number;
  dueDate?:      string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const goal = await prisma.goal.update({
    where: { id: input.goalId },
    data: {
      ...(input.title       !== undefined ? { title:       input.title }       : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.status      !== undefined ? { status:      input.status }      : {}),
      ...(input.progress    !== undefined ? { progress:    input.progress }    : {}),
      ...(input.kpiActual   !== undefined ? { kpiActual:   input.kpiActual }   : {}),
      ...(input.dueDate     !== undefined ? { dueDate:     new Date(input.dueDate) } : {}),
    },
  });

  revalidatePath("/[orgSlug]/performance", "page");
  return { success: true, data: goal };
}

export async function deleteGoal(goalId: string, organizationId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  await prisma.goal.delete({ where: { id: goalId } });
  revalidatePath("/[orgSlug]/performance", "page");
  return { success: true };
}

// ── 360 Feedback ─────────────────────────────────────────────

export async function submitFeedback(input: {
  reviewId:       string;
  giverId:        string;
  receiverId:     string;
  organizationId: string;
  feedback:       string;
  rating?:        number;
  isAnonymous?:   boolean;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const fb = await prisma.performanceFeedback.create({
    data: {
      reviewId:    input.reviewId,
      giverId:     input.giverId,
      receiverId:  input.receiverId,
      feedback:    input.feedback,
      rating:      input.rating      ?? null,
      isAnonymous: input.isAnonymous ?? false,
    },
  });

  revalidatePath("/[orgSlug]/performance", "page");
  return { success: true, data: fb };
}

// ── Summary Stats ─────────────────────────────────────────────

export async function getPerformanceSummary(organizationId: string) {
  const [byStatus, avgRating, recentReviews] = await Promise.all([
    prisma.performanceReview.groupBy({
      by:    ["status"],
      where: { employee: { organizationId } },
      _count: { id: true },
    }),
    prisma.performanceReview.aggregate({
      where:   { employee: { organizationId }, status: "COMPLETED", rating: { not: null } },
      _avg:    { rating: true },
      _count:  { id: true },
    }),
    prisma.performanceReview.findMany({
      where:   { employee: { organizationId } },
      orderBy: { createdAt: "desc" },
      take:    5,
      include: {
        employee: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  const statMap = Object.fromEntries(byStatus.map(s => [s.status, s._count.id]));

  return {
    total:         Object.values(statMap).reduce((a, b) => a + b, 0),
    draft:         statMap["DRAFT"]       ?? 0,
    inProgress:    statMap["IN_PROGRESS"] ?? 0,
    completed:     statMap["COMPLETED"]   ?? 0,
    avgRating:     avgRating._avg.rating ? Number(avgRating._avg.rating).toFixed(1) : null,
    completedCount: avgRating._count.id,
    recentReviews,
  };
}
