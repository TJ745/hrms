"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/actions/audit.actions";
import { createNotification } from "@/actions/notification.actions";
import type { TicketStatus, TicketPriority, TicketCategory } from "@prisma/client";

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

// ══════════════════════════════════════════════
// ONBOARDING
// ══════════════════════════════════════════════

export async function createOnboardingTemplate(input: {
  organizationId: string;
  name:           string;
  description?:   string;
  isDefault?:     boolean;
  tasks: {
    title:       string;
    description?: string;
    category?:   string;
    dueInDays:   number;
    isRequired:  boolean;
    order:       number;
  }[];
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const template = await prisma.onboardingTemplate.create({
    data: {
      organizationId: input.organizationId,
      name:           input.name,
      description:    input.description ?? null,
      isDefault:      input.isDefault   ?? false,
      tasks: {
        create: input.tasks.map(t => ({
          title:       t.title,
          description: t.description ?? null,
          category:    t.category    ?? null,
          dueInDays:   t.dueInDays,
          isRequired:  t.isRequired,
          order:       t.order,
        })),
      },
    },
    include: { tasks: { orderBy: { order: "asc" } } },
  });

  revalidatePath("/[orgSlug]/onboarding");
  return { success: true, data: template };
}

export async function assignOnboarding(input: {
  employeeId:  string;
  templateId:  string;
  organizationId: string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  // Get template with tasks
  const template = await prisma.onboardingTemplate.findUnique({
    where:   { id: input.templateId },
    include: { tasks: true },
  });
  if (!template) return { success: false, error: "Template not found" };

  const onboarding = await prisma.employeeOnboarding.create({
    data: {
      employeeId:  input.employeeId,
      templateId:  input.templateId,
      progress:    0,
      tasks: {
        create: template.tasks.map(t => ({
          taskId:      t.id,
          isCompleted: false,
        })),
      },
    },
    include: { tasks: { include: { task: true } } },
  });

  revalidatePath("/[orgSlug]/onboarding");
  return { success: true, data: onboarding };
}

export async function completeOnboardingTask(input: {
  onboardingTaskId: string;
  employeeId:       string;
  notes?:           string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const task = await prisma.employeeOnboardingTask.update({
    where:   { id: input.onboardingTaskId },
    data: {
      isCompleted: true,
      completedAt: new Date(),
      completedBy: session.user.id,
      notes:       input.notes ?? null,
    },
  });

  // Update progress
  const allTasks = await prisma.employeeOnboardingTask.findMany({
    where: { onboardingId: task.onboardingId },
  });
  const completed = allTasks.filter(t => t.isCompleted).length;
  const progress  = Math.round((completed / allTasks.length) * 100);

  await prisma.employeeOnboarding.update({
    where: { id: task.onboardingId },
    data: {
      progress,
      completedAt: progress === 100 ? new Date() : null,
    },
  });

  revalidatePath("/[orgSlug]/onboarding");
  return { success: true };
}

export async function getOnboardingTemplates(organizationId: string) {
  return prisma.onboardingTemplate.findMany({
    where:   { organizationId },
    include: { tasks: { orderBy: { order: "asc" } }, _count: { select: { tasks: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getEmployeeOnboarding(employeeId: string) {
  return prisma.employeeOnboarding.findUnique({
    where:   { employeeId },
    include: {
      tasks: {
        include: { task: true },
        orderBy: { task: { order: "asc" } },
      },
    },
  });
}

export async function getOnboardingList(organizationId: string) {
  return prisma.employeeOnboarding.findMany({
    where: { employee: { organizationId } },
    include: {
      employee: { select: { firstName: true, lastName: true, employeeCode: true, avatar: true, hireDate: true } },
      tasks:    { include: { task: true } },
    },
    orderBy: { startedAt: "desc" },
  });
}

// ══════════════════════════════════════════════
// TRAINING & CERTIFICATIONS
// ══════════════════════════════════════════════

export async function createTraining(input: {
  organizationId: string;
  title:          string;
  description?:   string;
  provider?:      string;
  type?:          string;
  startDate?:     string;
  endDate?:       string;
  cost?:          number;
  currency?:      string;
  maxAttendees?:  number;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const training = await prisma.training.create({
    data: {
      organizationId: input.organizationId,
      title:          input.title,
      description:    input.description  ?? null,
      provider:       input.provider     ?? null,
      type:           input.type         ?? null,
      startDate:      input.startDate    ? new Date(input.startDate) : null,
      endDate:        input.endDate      ? new Date(input.endDate)   : null,
      cost:           input.cost         ?? null,
      currency:       input.currency     ?? "USD",
      maxAttendees:   input.maxAttendees ?? null,
    },
  });

  revalidatePath("/[orgSlug]/training");
  return { success: true, data: training };
}

export async function enrollInTraining(input: {
  trainingId:  string;
  employeeId:  string;
  organizationId: string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  // Check if already enrolled
  const existing = await prisma.trainingEnrollment.findUnique({
    where: { trainingId_employeeId: { trainingId: input.trainingId, employeeId: input.employeeId } },
  });
  if (existing) return { success: false, error: "Already enrolled" };

  const enrollment = await prisma.trainingEnrollment.create({
    data: {
      trainingId: input.trainingId,
      employeeId: input.employeeId,
      status:     "ENROLLED",
    },
  });

  revalidatePath("/[orgSlug]/training");
  return { success: true, data: enrollment };
}

export async function completeTraining(input: {
  enrollmentId: string;
  score?:       number;
  certificate?: string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const enrollment = await prisma.trainingEnrollment.update({
    where: { id: input.enrollmentId },
    data: {
      status:      "COMPLETED",
      completedAt: new Date(),
      score:       input.score       ?? null,
      certificate: input.certificate ?? null,
    },
  });

  revalidatePath("/[orgSlug]/training");
  return { success: true, data: enrollment };
}

export async function getTrainings(organizationId: string) {
  return prisma.training.findMany({
    where:   { organizationId },
    include: {
      enrollments: {
        include: { training: { select: { id: true } } },
      },
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createCertification(input: {
  employeeId:   string;
  name:         string;
  issuer?:      string;
  issuedAt?:    string;
  expiresAt?:   string;
  fileUrl?:     string;
  credentialId?: string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const cert = await prisma.certification.create({
    data: {
      employeeId:   input.employeeId,
      name:         input.name,
      issuer:       input.issuer       ?? null,
      issuedAt:     input.issuedAt     ? new Date(input.issuedAt)  : null,
      expiresAt:    input.expiresAt    ? new Date(input.expiresAt) : null,
      fileUrl:      input.fileUrl      ?? null,
      credentialId: input.credentialId ?? null,
    },
  });

  revalidatePath("/[orgSlug]/training");
  return { success: true, data: cert };
}

export async function getEmployeeCertifications(employeeId: string) {
  return prisma.certification.findMany({
    where:   { employeeId },
    orderBy: { issuedAt: "desc" },
  });
}

// ══════════════════════════════════════════════
// SUPPORT TICKETS
// ══════════════════════════════════════════════

export async function createTicket(input: {
  organizationId: string;
  employeeId:     string;
  category:       TicketCategory;
  title:          string;
  description:    string;
  priority?:      TicketPriority;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const ticket = await prisma.ticket.create({
    data: {
      organizationId: input.organizationId,
      employeeId:     input.employeeId,
      category:       input.category,
      title:          input.title,
      description:    input.description,
      priority:       input.priority ?? "MEDIUM",
      status:         "OPEN",
    },
  });

  revalidatePath("/[orgSlug]/tickets");
  return { success: true, data: ticket };
}

export async function updateTicketStatus(input: {
  ticketId:       string;
  status:         TicketStatus;
  assignedToId?:  string;
  organizationId: string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const ticket = await prisma.ticket.update({
    where: { id: input.ticketId },
    data: {
      status:       input.status,
      assignedToId: input.assignedToId ?? undefined,
      resolvedAt:   input.status === "RESOLVED" || input.status === "CLOSED" ? new Date() : null,
    },
    include: { employee: { include: { user: { select: { id: true } } } } },
  });

  // Notify ticket creator
  await createNotification({
    userId: ticket.employee.user.id,
    type:   "TICKET_UPDATE",
    title:  `Ticket ${input.status === "RESOLVED" ? "Resolved" : "Updated"}`,
    body:   `Your ticket "${ticket.title}" has been ${input.status.toLowerCase().replace("_", " ")}.`,
    link:   `/tickets`,
  });

  revalidatePath("/[orgSlug]/tickets");
  return { success: true, data: ticket };
}

export async function addTicketComment(input: {
  ticketId: string;
  userId:   string;
  content:  string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const comment = await prisma.ticketComment.create({
    data: {
      ticketId: input.ticketId,
      userId:   input.userId,
      content:  input.content,
    },
  });

  revalidatePath("/[orgSlug]/tickets");
  return { success: true, data: comment };
}

export async function getTickets(input: {
  organizationId: string;
  employeeId?:    string;
  status?:        TicketStatus;
  category?:      TicketCategory;
  priority?:      TicketPriority;
}) {
  return prisma.ticket.findMany({
    where: {
      organizationId: input.organizationId,
      ...(input.employeeId ? { employeeId: input.employeeId } : {}),
      ...(input.status     ? { status: input.status }         : {}),
      ...(input.category   ? { category: input.category }     : {}),
      ...(input.priority   ? { priority: input.priority }     : {}),
    },
    include: {
      employee:   { select: { firstName: true, lastName: true, employeeCode: true, avatar: true } },
      assignedTo: { select: { firstName: true, lastName: true } },
      comments:   { orderBy: { createdAt: "asc" } },
      _count:     { select: { comments: true } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
}

export async function getTicket(ticketId: string) {
  return prisma.ticket.findUnique({
    where:   { id: ticketId },
    include: {
      employee:   { select: { firstName: true, lastName: true, employeeCode: true, avatar: true } },
      assignedTo: { select: { firstName: true, lastName: true } },
      comments:   { orderBy: { createdAt: "asc" } },
    },
  });
}

// ══════════════════════════════════════════════
// EMPLOYEE LOANS
// ══════════════════════════════════════════════

export async function createLoan(input: {
  employeeId:   string;
  organizationId: string;
  amount:       number;
  installment:  number;
  startMonth:   number;
  startYear:    number;
  reason?:      string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  // Check for existing active loan
  const existing = await prisma.employeeLoan.findFirst({
    where: { employeeId: input.employeeId, status: "ACTIVE" },
  });
  if (existing) return { success: false, error: "Employee already has an active loan" };

  const loan = await prisma.employeeLoan.create({
    data: {
      employeeId:      input.employeeId,
      amount:          input.amount,
      remainingAmount: input.amount,
      installment:     input.installment,
      startMonth:      input.startMonth,
      startYear:       input.startYear,
      reason:          input.reason ?? null,
      status:          "ACTIVE",
      approvedBy:      session.user.id,
    },
    include: { employee: { include: { user: { select: { id: true } } } } },
  });

  await createNotification({
    userId: loan.employee.user.id,
    type:   "GENERAL",
    title:  "Loan Approved",
    body:   `Your loan of ${input.amount} has been approved. Monthly installment: ${input.installment}.`,
    link:   `/profile`,
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId:         session.user.id,
    action:         "CREATE",
    entity:         "EmployeeLoan",
    entityId:       loan.id,
    newValues:      { amount: input.amount, installment: input.installment },
  });

  revalidatePath("/[orgSlug]/payroll");
  return { success: true, data: loan };
}

export async function getEmployeeLoans(input: {
  organizationId: string;
  employeeId?:    string;
  status?:        string;
}) {
  return prisma.employeeLoan.findMany({
    where: {
      employee: { organizationId: input.organizationId },
      ...(input.employeeId ? { employeeId: input.employeeId } : {}),
      ...(input.status     ? { status: input.status as any }  : {}),
    },
    include: {
      employee: { select: { firstName: true, lastName: true, employeeCode: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
