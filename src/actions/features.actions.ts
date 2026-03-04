"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

// ── COMPANY EVENTS ────────────────────────────────────────────

export async function createCompanyEvent(input: {
  organizationId: string;
  title:          string;
  description?:   string;
  type:           string;
  startDate:      string;
  endDate:        string;
  location?:      string;
  isAllDay?:      boolean;
  branchId?:      string;
  departmentId?:  string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const event = await prisma.companyEvent.create({
    data: {
      organizationId: input.organizationId,
      title:          input.title,
      description:    input.description    || null,
      type:           input.type,
      startDate:      new Date(input.startDate),
      endDate:        new Date(input.endDate),
      location:       input.location       || null,
      isAllDay:       input.isAllDay       ?? false,
      branchId:       input.branchId       || null,
      departmentId:   input.departmentId   || null,
      createdBy:      session.user.id,
    },
  });

  revalidatePath("/[orgSlug]/events", "page");
  return { success: true, data: event };
}

export async function updateCompanyEvent(input: {
  eventId:       string;
  title?:        string;
  description?:  string;
  type?:         string;
  startDate?:    string;
  endDate?:      string;
  location?:     string;
  isAllDay?:     boolean;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  await prisma.companyEvent.update({
    where: { id: input.eventId },
    data: {
      ...(input.title       !== undefined ? { title:       input.title }                   : {}),
      ...(input.description !== undefined ? { description: input.description }             : {}),
      ...(input.type        !== undefined ? { type:        input.type }                    : {}),
      ...(input.startDate   !== undefined ? { startDate:   new Date(input.startDate) }     : {}),
      ...(input.endDate     !== undefined ? { endDate:     new Date(input.endDate) }       : {}),
      ...(input.location    !== undefined ? { location:    input.location }                : {}),
      ...(input.isAllDay    !== undefined ? { isAllDay:    input.isAllDay }                : {}),
    },
  });

  revalidatePath("/[orgSlug]/events", "page");
  return { success: true };
}

export async function deleteCompanyEvent(eventId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  await prisma.companyEvent.delete({ where: { id: eventId } });
  revalidatePath("/[orgSlug]/events", "page");
  return { success: true };
}

export async function getCompanyEvents(organizationId: string) {
  return prisma.companyEvent.findMany({
    where:   { organizationId },
    include: {
      branch:     { select: { name: true } },
      department: { select: { name: true } },
    },
    orderBy: { startDate: "asc" },
  });
}

// ── POLICY & COMPLIANCE DOCUMENTS ────────────────────────────

export async function createPolicyDocument(input: {
  organizationId: string;
  title:          string;
  content?:       string;
  fileUrl?:       string;
  version:        string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const doc = await prisma.policyDocument.create({
    data: {
      organizationId: input.organizationId,
      title:          input.title,
      content:        input.content  || null,
      fileUrl:        input.fileUrl  || null,
      version:        input.version,
      isActive:       true,
      publishedAt:    new Date(),
    },
  });

  revalidatePath("/[orgSlug]/documents", "page");
  return { success: true, data: doc };
}

export async function updatePolicyDocument(input: {
  docId:    string;
  title?:   string;
  content?: string;
  fileUrl?: string;
  version?: string;
  isActive?: boolean;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  await prisma.policyDocument.update({
    where: { id: input.docId },
    data: {
      ...(input.title    !== undefined ? { title:    input.title }    : {}),
      ...(input.content  !== undefined ? { content:  input.content }  : {}),
      ...(input.fileUrl  !== undefined ? { fileUrl:  input.fileUrl }  : {}),
      ...(input.version  !== undefined ? { version:  input.version }  : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });

  revalidatePath("/[orgSlug]/documents", "page");
  return { success: true };
}

export async function deletePolicyDocument(docId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  await prisma.policyDocument.delete({ where: { id: docId } });
  revalidatePath("/[orgSlug]/documents", "page");
  return { success: true };
}

export async function getPolicyDocuments(organizationId: string) {
  return prisma.policyDocument.findMany({
    where:   { organizationId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createComplianceDocument(input: {
  organizationId: string;
  title:          string;
  type:           string;
  jurisdiction?:  string;
  fileUrl?:       string;
  version?:       string;
  expiryDate?:    string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const doc = await prisma.complianceDocument.create({
    data: {
      organizationId: input.organizationId,
      title:          input.title,
      type:           input.type         as any,
      jurisdiction:   input.jurisdiction || null,
      fileUrl:        input.fileUrl      || null,
      version:        input.version      || null,
      expiryDate:     input.expiryDate   ? new Date(input.expiryDate) : null,
    },
  });

  revalidatePath("/[orgSlug]/documents", "page");
  return { success: true, data: doc };
}

export async function deleteComplianceDocument(docId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  await prisma.complianceDocument.delete({ where: { id: docId } });
  revalidatePath("/[orgSlug]/documents", "page");
  return { success: true };
}

export async function getComplianceDocuments(organizationId: string) {
  return prisma.complianceDocument.findMany({
    where:   { organizationId },
    orderBy: { createdAt: "desc" },
  });
}

// ── SURVEYS ───────────────────────────────────────────────────

export async function createSurvey(input: {
  organizationId: string;
  title:          string;
  description?:   string;
  questions:      { id: string; text: string; type: "TEXT" | "RATING" | "YESNO" | "MULTIPLE"; options?: string[] }[];
  isAnonymous?:   boolean;
  deadline?:      string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const survey = await prisma.survey.create({
    data: {
      organizationId: input.organizationId,
      title:          input.title,
      description:    input.description || null,
      questions:      input.questions   as any,
      isAnonymous:    input.isAnonymous ?? false,
      deadline:       input.deadline    ? new Date(input.deadline) : null,
      isActive:       true,
      createdBy:      session.user.id,
    },
  });

  revalidatePath("/[orgSlug]/surveys", "page");
  return { success: true, data: survey };
}

export async function toggleSurveyActive(surveyId: string, isActive: boolean) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  await prisma.survey.update({ where: { id: surveyId }, data: { isActive } });
  revalidatePath("/[orgSlug]/surveys", "page");
  return { success: true };
}

export async function deleteSurvey(surveyId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  await prisma.survey.delete({ where: { id: surveyId } });
  revalidatePath("/[orgSlug]/surveys", "page");
  return { success: true };
}

export async function getSurveys(organizationId: string) {
  return prisma.survey.findMany({
    where:   { organizationId },
    include: { _count: { select: { responses: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSurvey(surveyId: string) {
  return prisma.survey.findUnique({
    where:   { id: surveyId },
    include: { responses: { include: { employee: { select: { firstName: true, lastName: true } } } } },
  });
}

export async function submitSurveyResponse(input: {
  surveyId:   string;
  employeeId?: string;
  answers:    Record<string, any>;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  // Check if already responded
  if (input.employeeId) {
    const existing = await prisma.surveyResponse.findFirst({
      where: { surveyId: input.surveyId, employeeId: input.employeeId },
    });
    if (existing) return { success: false, error: "Already responded to this survey" };
  }

  await prisma.surveyResponse.create({
    data: {
      surveyId:   input.surveyId,
      employeeId: input.employeeId || null,
      answers:    input.answers    as any,
    },
  });

  return { success: true };
}

// // ── SHIFT SCHEDULING ──────────────────────────────────────────

// export async function createWorkSchedule(input: {
//   organizationId: string;
//   name:           string;
//   workDays:       number[];
//   startTime:      string;
//   endTime:        string;
//   breakDuration?: number;
//   isDefault?:     boolean;
// }) {
//   const session = await getSession();
//   if (!session) return { success: false, error: "Unauthorized" };

//   if (input.isDefault) {
//     await prisma.workSchedule.updateMany({
//       where: { organizationId: input.organizationId },
//       data:  { isDefault: false },
//     });
//   }

//   const schedule = await prisma.workSchedule.create({
//     data: {
//       organizationId: input.organizationId,
//       name:           input.name,
//       workDays:       input.workDays,
//       startTime:      input.startTime,
//       endTime:        input.endTime,
//       breakDuration:  input.breakDuration ?? 60,
//       isDefault:      input.isDefault     ?? false,
//     },
//   });

//   revalidatePath("/[orgSlug]/shifts", "page");
//   return { success: true, data: schedule };
// }

// export async function createShift(input: {
//   workScheduleId: string;
//   name:           string;
//   startTime:      string;
//   endTime:        string;
//   isNight?:       boolean;
// }) {
//   const session = await getSession();
//   if (!session) return { success: false, error: "Unauthorized" };

//   const shift = await prisma.shift.create({
//     data: {
//       workScheduleId: input.workScheduleId,
//       name:           input.name,
//       startTime:      input.startTime,
//       endTime:        input.endTime,
//       isNight:        input.isNight ?? false,
//     },
//   });

//   revalidatePath("/[orgSlug]/shifts", "page");
//   return { success: true, data: shift };
// }

// export async function assignEmployeeShift(input: {
//   employeeId: string;
//   shiftId:    string;
//   date:       string;
// }) {
//   const session = await getSession();
//   if (!session) return { success: false, error: "Unauthorized" };

//   const employeeShift = await prisma.employeeShift.upsert({
//     where:  { employeeId_date: { employeeId: input.employeeId, date: new Date(input.date) } },
//     create: { employeeId: input.employeeId, shiftId: input.shiftId, date: new Date(input.date) },
//     update: { shiftId: input.shiftId },
//   });

//   revalidatePath("/[orgSlug]/shifts", "page");
//   return { success: true, data: employeeShift };
// }

// export async function deleteEmployeeShift(employeeShiftId: string) {
//   const session = await getSession();
//   if (!session) return { success: false, error: "Unauthorized" };

//   await prisma.employeeShift.delete({ where: { id: employeeShiftId } });
//   revalidatePath("/[orgSlug]/shifts", "page");
//   return { success: true };
// }

// export async function getWorkSchedules(organizationId: string) {
//   return prisma.workSchedule.findMany({
//     where:   { organizationId },
//     include: { shifts: true, _count: { select: { employees: true } } },
//     orderBy: [{ isDefault: "desc" }, { name: "asc" }],
//   });
// }

// export async function getShiftRoster(organizationId: string, weekStart: string) {
//   const start = new Date(weekStart);
//   const end   = new Date(weekStart);
//   end.setDate(end.getDate() + 6);

//   return prisma.employeeShift.findMany({
//     where: {
//       date:     { gte: start, lte: end },
//       employee: { organizationId },
//     },
//     include: {
//       shift:    { include: { workSchedule: { select: { name: true } } } },
//       employee: { select: { id: true, firstName: true, lastName: true, avatar: true, employeeCode: true,
//                             department: { select: { name: true } } } },
//     },
//     orderBy: [{ date: "asc" }, { employee: { firstName: "asc" } }],
//   });
// }


// ── SHIFT SCHEDULING ──────────────────────────────────────────

export async function createWorkSchedule(input: {
  organizationId: string;
  name:           string;
  workDays:       number[];
  startTime:      string;
  endTime:        string;
  breakDuration?: number;
  isDefault?:     boolean;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  if (input.isDefault) {
    await prisma.workSchedule.updateMany({
      where: { organizationId: input.organizationId },
      data:  { isDefault: false },
    });
  }

  const schedule = await prisma.workSchedule.create({
    data: {
      organizationId: input.organizationId,
      name:           input.name,
      workDays:       input.workDays,
      startTime:      input.startTime,
      endTime:        input.endTime,
      breakDuration:  input.breakDuration ?? 60,
      isDefault:      input.isDefault     ?? false,
    },
  });

  revalidatePath("/[orgSlug]/shifts", "page");
  return { success: true, data: schedule };
}

export async function createShift(input: {
  workScheduleId: string;
  name:           string;
  startTime:      string;
  endTime:        string;
  isNight?:       boolean;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const shift = await prisma.shift.create({
    data: {
      workScheduleId: input.workScheduleId,
      name:           input.name,
      startTime:      input.startTime,
      endTime:        input.endTime,
      isNight:        input.isNight ?? false,
    },
  });

  revalidatePath("/[orgSlug]/shifts", "page");
  return { success: true, data: shift };
}

export async function assignEmployeeShift(input: {
  employeeId: string;
  shiftId:    string;
  date:       string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const employeeShift = await prisma.employeeShift.upsert({
    where:  { employeeId_date: { employeeId: input.employeeId, date: new Date(input.date) } },
    create: { employeeId: input.employeeId, shiftId: input.shiftId, date: new Date(input.date) },
    update: { shiftId: input.shiftId },
  });

  revalidatePath("/[orgSlug]/shifts", "page");
  return { success: true, data: employeeShift };
}

export async function deleteEmployeeShift(employeeShiftId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  await prisma.employeeShift.delete({ where: { id: employeeShiftId } });
  revalidatePath("/[orgSlug]/shifts", "page");
  return { success: true };
}

export async function getWorkSchedules(organizationId: string) {
  return prisma.workSchedule.findMany({
    where:   { organizationId },
    include: { shifts: true, _count: { select: { employees: true } } },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

export async function getShiftRoster(organizationId: string, weekStart: string) {
  const start = new Date(weekStart);
  const end   = new Date(weekStart);
  end.setDate(end.getDate() + 6);

  // EmployeeShift has no @relation to Employee in schema (only employeeId string field),
  // so we fetch org employees first, then filter shifts by their IDs.
  const orgEmployees = await prisma.employee.findMany({
    where:  { organizationId },
    select: {
      id: true, firstName: true, lastName: true,
      avatar: true, employeeCode: true,
      department: { select: { name: true } },
    },
  });

  const employeeIds = orgEmployees.map((e) => e.id);
  const employeeMap = Object.fromEntries(orgEmployees.map((e) => [e.id, e]));

  const shifts = await prisma.employeeShift.findMany({
    where: {
      date:       { gte: start, lte: end },
      employeeId: { in: employeeIds },
    },
    include: {
      shift: { include: { workSchedule: { select: { name: true } } } },
    },
    orderBy: { date: "asc" },
  });

  return shifts
    .map((s) => ({ ...s, employee: employeeMap[s.employeeId] ?? null }))
    .sort((a, b) => {
      const d = a.date.getTime() - b.date.getTime();
      if (d !== 0) return d;
      return (a.employee?.firstName ?? "").localeCompare(b.employee?.firstName ?? "");
    });
}

// ── COMPETENCIES ──────────────────────────────────────────────

export async function createCompetency(input: {
  name:         string;
  description?: string;
  category?:    string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const competency = await prisma.competency.create({
    data: { name: input.name, description: input.description || null, category: input.category || null },
  });

  revalidatePath("/[orgSlug]/competencies", "page");
  return { success: true, data: competency };
}

export async function deleteCompetency(competencyId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  await prisma.competency.delete({ where: { id: competencyId } });
  revalidatePath("/[orgSlug]/competencies", "page");
  return { success: true };
}

export async function getCompetencies() {
  return prisma.competency.findMany({
    include: { _count: { select: { employeeCompetencies: true } } },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

export async function upsertEmployeeCompetency(input: {
  employeeId:   string;
  competencyId: string;
  rating:       number;
  assessedBy?:  string;
  notes?:       string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  await prisma.employeeCompetency.upsert({
    where:  { employeeId_competencyId: { employeeId: input.employeeId, competencyId: input.competencyId } },
    create: { employeeId: input.employeeId, competencyId: input.competencyId, rating: input.rating,
              assessedBy: input.assessedBy || null, notes: input.notes || null },
    update: { rating: input.rating, assessedBy: input.assessedBy || null,
              notes: input.notes || null, assessedAt: new Date() },
  });

  revalidatePath("/[orgSlug]/competencies", "page");
  return { success: true };
}

export async function getEmployeeCompetencies(organizationId: string) {
  return prisma.employeeCompetency.findMany({
    where:   { employee: { organizationId } },
    include: {
      employee:   { select: { id: true, firstName: true, lastName: true, employeeCode: true, avatar: true,
                              department: { select: { name: true } } } },
      competency: { select: { id: true, name: true, category: true } },
    },
    orderBy: [{ employee: { firstName: "asc" } }, { competency: { name: "asc" } }],
  });
}

// ── OVERTIME POLICIES ─────────────────────────────────────────

export async function createOvertimePolicy(input: {
  organizationId: string;
  name:           string;
  rateMultiplier: number;
  afterHours:     number;
  maxHoursPerDay?: number;
  isDefault?:     boolean;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  if (input.isDefault) {
    await prisma.overtimePolicy.updateMany({
      where: { organizationId: input.organizationId },
      data:  { isDefault: false },
    });
  }

  const policy = await prisma.overtimePolicy.create({
    data: {
      organizationId: input.organizationId,
      name:           input.name,
      rateMultiplier: input.rateMultiplier,
      afterHours:     input.afterHours,
      maxHoursPerDay: input.maxHoursPerDay || null,
      isDefault:      input.isDefault     ?? false,
    },
  });

  revalidatePath("/[orgSlug]/overtime", "page");
  return { success: true, data: policy };
}

export async function updateOvertimePolicy(input: {
  policyId:        string;
  name?:           string;
  rateMultiplier?: number;
  afterHours?:     number;
  maxHoursPerDay?: number;
  isDefault?:      boolean;
  organizationId:  string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  if (input.isDefault) {
    await prisma.overtimePolicy.updateMany({
      where: { organizationId: input.organizationId, id: { not: input.policyId } },
      data:  { isDefault: false },
    });
  }

  await prisma.overtimePolicy.update({
    where: { id: input.policyId },
    data: {
      ...(input.name           !== undefined ? { name:           input.name }           : {}),
      ...(input.rateMultiplier !== undefined ? { rateMultiplier: input.rateMultiplier } : {}),
      ...(input.afterHours     !== undefined ? { afterHours:     input.afterHours }     : {}),
      ...(input.maxHoursPerDay !== undefined ? { maxHoursPerDay: input.maxHoursPerDay } : {}),
      ...(input.isDefault      !== undefined ? { isDefault:      input.isDefault }      : {}),
    },
  });

  revalidatePath("/[orgSlug]/overtime", "page");
  return { success: true };
}

export async function deleteOvertimePolicy(policyId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  await prisma.overtimePolicy.delete({ where: { id: policyId } });
  revalidatePath("/[orgSlug]/overtime", "page");
  return { success: true };
}

export async function getOvertimePolicies(organizationId: string) {
  return prisma.overtimePolicy.findMany({
    where:   { organizationId },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

// ── TOIL BALANCE ──────────────────────────────────────────────

export async function upsertTOILBalance(input: {
  employeeId:   string;
  hoursEarned?: number;
  hoursUsed?:   number;
  expiresAt?:   string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const existing = await prisma.tOILBalance.findUnique({ where: { employeeId: input.employeeId } });

  if (existing) {
    await prisma.tOILBalance.update({
      where: { employeeId: input.employeeId },
      data: {
        ...(input.hoursEarned !== undefined ? { hoursEarned: existing.hoursEarned.toNumber() + input.hoursEarned } : {}),
        ...(input.hoursUsed   !== undefined ? { hoursUsed:   existing.hoursUsed.toNumber()   + input.hoursUsed }   : {}),
        ...(input.expiresAt   !== undefined ? { expiresAt:   new Date(input.expiresAt) }                           : {}),
      },
    });
  } else {
    await prisma.tOILBalance.create({
      data: {
        employeeId:  input.employeeId,
        hoursEarned: input.hoursEarned ?? 0,
        hoursUsed:   input.hoursUsed   ?? 0,
        expiresAt:   input.expiresAt   ? new Date(input.expiresAt) : null,
      },
    });
  }

  revalidatePath("/[orgSlug]/toil", "page");
  return { success: true };
}

export async function getTOILBalances(organizationId: string) {
  return prisma.tOILBalance.findMany({
    where:   { employee: { organizationId } },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, avatar: true,
                            department: { select: { name: true } } } },
    },
    orderBy: { employee: { firstName: "asc" } },
  });
}

export async function getMyTOILBalance(employeeId: string) {
  return prisma.tOILBalance.findUnique({ where: { employeeId } });
}
