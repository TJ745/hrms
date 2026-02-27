"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/actions/audit.actions";
import type { JobStatus, ApplicationStatus, EmploymentType } from "@prisma/client";

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

// ── Job Postings ─────────────────────────────────────────────

export async function createJobPosting(input: {
  organizationId:    string;
  positionId?:       string;
  title:             string;
  description:       string;
  requirements?:     string;
  responsibilities?: string;
  employmentType:    EmploymentType;
  location?:         string;
  minSalary?:        number;
  maxSalary?:        number;
  currency?:         string;
  openings:          number;
  deadline?:         string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    const posting = await prisma.jobPosting.create({
      data: {
        organizationId:   input.organizationId,
        positionId:       input.positionId       ?? null,
        title:            input.title,
        description:      input.description,
        requirements:     input.requirements      ?? null,
        responsibilities: input.responsibilities  ?? null,
        employmentType:   input.employmentType,
        location:         input.location          ?? null,
        minSalary:        input.minSalary          ?? null,
        maxSalary:        input.maxSalary          ?? null,
        currency:         input.currency           ?? "USD",
        openings:         input.openings,
        deadline:         input.deadline ? new Date(input.deadline) : null,
        status:           "DRAFT",
        createdBy:        session.user.id,
      },
    });

    await createAuditLog({
      organizationId: input.organizationId,
      userId:         session.user.id,
      action:         "CREATE",
      entity:         "JobPosting",
      entityId:       posting.id,
      newValues:      { title: input.title },
    });

    revalidatePath("/[orgSlug]/recruitment", "page");
    return { success: true, data: posting };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create job posting" };
  }
}

export async function updateJobPostingStatus(id: string, status: JobStatus, organizationId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const posting = await prisma.jobPosting.update({
    where: { id },
    data:  {
      status,
      postedAt: status === "OPEN" ? new Date() : undefined,
    },
  });

  revalidatePath("/[orgSlug]/recruitment", "page");
  return { success: true, data: posting };
}

export async function getJobPostings(params: {
  organizationId: string;
  status?:        JobStatus;
  page?:          number;
  perPage?:       number;
}) {
  const { organizationId, status, page = 1, perPage = 20 } = params;

  const where = {
    organizationId,
    ...(status ? { status } : {}),
  };

  const [postings, total] = await Promise.all([
    prisma.jobPosting.findMany({
      where,
      include: {
        position: { select: { title: true } },
        _count:   { select: { applications: true } },
      },
      orderBy: { createdAt: "desc" },
      skip:    (page - 1) * perPage,
      take:    perPage,
    }),
    prisma.jobPosting.count({ where }),
  ]);

  return { postings, total, page, perPage, totalPages: Math.ceil(total / perPage) };
}

export async function getJobPosting(id: string, organizationId: string) {
  return prisma.jobPosting.findFirst({
    where: { id, organizationId },
    include: {
      position:     { select: { title: true } },
      applications: {
        include: { interviews: { orderBy: { scheduledAt: "asc" }, take: 1 } },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { applications: true } },
    },
  });
}

// ── Applications ─────────────────────────────────────────────

export async function createApplication(input: {
  jobPostingId: string;
  firstName:    string;
  lastName:     string;
  email:        string;
  phone?:       string;
  resumeUrl?:   string;
  coverLetter?: string;
  source?:      string;
  notes?:       string;
}) {
  try {
    const existing = await prisma.application.findFirst({
      where: { jobPostingId: input.jobPostingId, email: input.email },
    });
    if (existing) return { success: false, error: "An application with this email already exists for this position" };

    const application = await prisma.application.create({
      data: {
        jobPostingId: input.jobPostingId,
        firstName:    input.firstName,
        lastName:     input.lastName,
        email:        input.email,
        phone:        input.phone       ?? null,
        resumeUrl:    input.resumeUrl   ?? null,
        coverLetter:  input.coverLetter ?? null,
        source:       input.source      ?? "DIRECT",
        notes:        input.notes       ?? null,
        status:       "APPLIED",
      },
    });

    revalidatePath("/[orgSlug]/recruitment", "page");
    return { success: true, data: application };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to submit application" };
  }
}

export async function updateApplicationStatus(input: {
  applicationId:  string;
  status:         ApplicationStatus;
  organizationId: string;
  notes?:         string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const application = await prisma.application.update({
    where: { id: input.applicationId },
    data: {
      status: input.status,
      notes:  input.notes ?? null,
      ...(input.status === "HIRED" ? { hiredAt: new Date() } : {}),
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId:         session.user.id,
    action:         "UPDATE",
    entity:         "Application",
    entityId:       input.applicationId,
    newValues:      { status: input.status },
  });

  revalidatePath("/[orgSlug]/recruitment", "page");
  return { success: true, data: application };
}

export async function getApplications(params: {
  organizationId: string;
  jobPostingId?:  string;
  status?:        ApplicationStatus;
  search?:        string;
  page?:          number;
  perPage?:       number;
}) {
  const { organizationId, jobPostingId, status, search, page = 1, perPage = 20 } = params;

  const where = {
    jobPosting: { organizationId },
    ...(jobPostingId ? { jobPostingId } : {}),
    ...(status       ? { status }        : {}),
    ...(search ? {
      OR: [
        { firstName: { contains: search, mode: "insensitive" as const } },
        { lastName:  { contains: search, mode: "insensitive" as const } },
        { email:     { contains: search, mode: "insensitive" as const } },
      ],
    } : {}),
  };

  const [applications, total] = await Promise.all([
    prisma.application.findMany({
      where,
      include: {
        jobPosting: { select: { id: true, title: true, organizationId: true } },
        interviews: { orderBy: { scheduledAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      skip:    (page - 1) * perPage,
      take:    perPage,
    }),
    prisma.application.count({ where }),
  ]);

  return { applications, total, page, perPage, totalPages: Math.ceil(total / perPage) };
}

export async function getApplication(id: string, organizationId: string) {
  return prisma.application.findFirst({
    where:   { id, jobPosting: { organizationId } },
    include: {
      jobPosting: {
        select: {
          title:          true,
          employmentType: true,
          location:       true,
          organizationId: true,
        }
      },
      interviews: { orderBy: { scheduledAt: "asc" } },
    },
  });
}

// ── Schedule Interview ───────────────────────────────────────

export async function scheduleInterview(input: {
  applicationId: string;
  type:          string;
  scheduledAt:   string;
  duration?:     number;
  location?:     string;
  meetingLink?:  string;
  interviewers?: string[];
  notes?:        string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const interview = await prisma.interview.create({
    data: {
      applicationId: input.applicationId,
      type:          input.type as any,
      scheduledAt:   new Date(input.scheduledAt),
      duration:      input.duration    ?? 60,
      location:      input.location    ?? null,
      meetingLink:   input.meetingLink ?? null,
      interviewers:  input.interviewers ?? [],
      status:        "SCHEDULED",
    },
  });

  await prisma.application.update({
    where: { id: input.applicationId },
    data:  { status: "INTERVIEW" },
  });

  revalidatePath("/[orgSlug]/recruitment", "page");
  return { success: true, data: interview };
}
