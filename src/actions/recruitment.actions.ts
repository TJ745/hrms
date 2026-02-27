// "use server";

// import { prisma } from "@/lib/prisma";
// import { auth } from "@/lib/auth";
// import { headers } from "next/headers";
// import { revalidatePath } from "next/cache";
// import { createAuditLog } from "@/actions/audit.actions";
// import { createNotification } from "@/actions/notification.actions";
// import type { JobPostingStatus, ApplicationStatus } from "@prisma/client";

// async function getSession() {
//   return auth.api.getSession({ headers: await headers() });
// }

// // ── Job Postings ─────────────────────────────────────────────

// export async function createJobPosting(input: {
//   organizationId: string;
//   branchId?:      string;
//   departmentId?:  string;
//   positionId?:    string;
//   title:          string;
//   description:    string;
//   requirements?:  string;
//   responsibilities?: string;
//   type:           string;
//   location?:      string;
//   isRemote?:      boolean;
//   salaryMin?:     number;
//   salaryMax?:     number;
//   currency?:      string;
//   openings:       number;
//   deadline?:      string;
//   experienceMin?: number;
//   experienceMax?: number;
// }) {
//   const session = await getSession();
//   if (!session) return { success: false, error: "Unauthorized" };

//   try {
//     const posting = await prisma.jobPosting.create({
//       data: {
//         organizationId:   input.organizationId,
//         branchId:         input.branchId         || null,
//         departmentId:     input.departmentId      || null,
//         positionId:       input.positionId        || null,
//         title:            input.title,
//         description:      input.description,
//         requirements:     input.requirements      || null,
//         responsibilities: input.responsibilities  || null,
//         type:             input.type as any,
//         location:         input.location          || null,
//         isRemote:         input.isRemote          || false,
//         salaryMin:        input.salaryMin          || null,
//         salaryMax:        input.salaryMax          || null,
//         currency:         input.currency           || "USD",
//         openings:         input.openings,
//         deadline:         input.deadline ? new Date(input.deadline) : null,
//         experienceMin:    input.experienceMin      || null,
//         experienceMax:    input.experienceMax      || null,
//         status:           "OPEN",
//         postedById:       session.user.id,
//       },
//     });

//     await createAuditLog({
//       organizationId: input.organizationId,
//       userId:         session.user.id,
//       action:         "CREATE",
//       entity:         "JobPosting",
//       entityId:       posting.id,
//       newValues:      { title: input.title },
//     });

//     revalidatePath("/[orgSlug]/recruitment", "page");
//     return { success: true, data: posting };
//   } catch (error: unknown) {
//     return { success: false, error: error instanceof Error ? error.message : "Failed to create job posting" };
//   }
// }

// export async function updateJobPostingStatus(id: string, status: JobPostingStatus, organizationId: string) {
//   const session = await getSession();
//   if (!session) return { success: false, error: "Unauthorized" };

//   const posting = await prisma.jobPosting.update({
//     where: { id },
//     data:  { status, closedAt: status === "CLOSED" ? new Date() : null },
//   });

//   revalidatePath("/[orgSlug]/recruitment", "page");
//   return { success: true, data: posting };
// }

// export async function getJobPostings(params: {
//   organizationId: string;
//   branchId?:      string;
//   status?:        JobPostingStatus;
//   page?:          number;
//   perPage?:       number;
// }) {
//   const { organizationId, branchId, status, page = 1, perPage = 20 } = params;

//   const where = {
//     organizationId,
//     ...(branchId ? { branchId } : {}),
//     ...(status    ? { status }   : {}),
//   };

//   const [postings, total] = await Promise.all([
//     prisma.jobPosting.findMany({
//       where,
//       include: {
//         department: { select: { name: true } },
//         branch:     { select: { name: true } },
//         _count:     { select: { applications: true } },
//       },
//       orderBy: { createdAt: "desc" },
//       skip:    (page - 1) * perPage,
//       take:    perPage,
//     }),
//     prisma.jobPosting.count({ where }),
//   ]);

//   return { postings, total, page, perPage, totalPages: Math.ceil(total / perPage) };
// }

// export async function getJobPosting(id: string, organizationId: string) {
//   return prisma.jobPosting.findFirst({
//     where: { id, organizationId },
//     include: {
//       department: { select: { name: true } },
//       branch:     { select: { name: true } },
//       position:   { select: { title: true } },
//       applications: {
//         include: {
//           interviews: { orderBy: { scheduledAt: "asc" }, take: 1 },
//         },
//         orderBy: { createdAt: "desc" },
//       },
//       _count: { select: { applications: true } },
//     },
//   });
// }

// // ── Applications ─────────────────────────────────────────────

// export async function createApplication(input: {
//   jobPostingId:    string;
//   organizationId:  string;
//   firstName:       string;
//   lastName:        string;
//   email:           string;
//   phone?:          string;
//   resumeUrl?:      string;
//   coverLetter?:    string;
//   linkedinUrl?:    string;
//   portfolioUrl?:   string;
//   expectedSalary?: number;
//   noticePeriod?:   number;
//   yearsExperience?: number;
//   currentCompany?: string;
//   currentRole?:    string;
//   source?:         string;
// }) {
//   try {
//     // Check for duplicate application
//     const existing = await prisma.application.findFirst({
//       where: { jobPostingId: input.jobPostingId, email: input.email },
//     });
//     if (existing) return { success: false, error: "An application with this email already exists for this position" };

//     const application = await prisma.application.create({
//       data: {
//         jobPostingId:    input.jobPostingId,
//         organizationId:  input.organizationId,
//         firstName:       input.firstName,
//         lastName:        input.lastName,
//         email:           input.email,
//         phone:           input.phone           || null,
//         resumeUrl:       input.resumeUrl        || null,
//         coverLetter:     input.coverLetter      || null,
//         linkedinUrl:     input.linkedinUrl      || null,
//         portfolioUrl:    input.portfolioUrl     || null,
//         expectedSalary:  input.expectedSalary   || null,
//         noticePeriod:    input.noticePeriod      || null,
//         yearsExperience: input.yearsExperience  || null,
//         currentCompany:  input.currentCompany   || null,
//         currentRole:     input.currentRole      || null,
//         source:          input.source           || "DIRECT",
//         status:          "NEW",
//       },
//     });

//     revalidatePath("/[orgSlug]/recruitment", "page");
//     return { success: true, data: application };
//   } catch (error: unknown) {
//     return { success: false, error: error instanceof Error ? error.message : "Failed to submit application" };
//   }
// }

// export async function updateApplicationStatus(input: {
//   applicationId:  string;
//   status:         ApplicationStatus;
//   organizationId: string;
//   notes?:         string;
// }) {
//   const session = await getSession();
//   if (!session) return { success: false, error: "Unauthorized" };

//   const application = await prisma.application.update({
//     where: { id: input.applicationId },
//     data: {
//       status:    input.status,
//       notes:     input.notes || null,
//       reviewedBy: session.user.id,
//       reviewedAt: new Date(),
//     },
//   });

//   await createAuditLog({
//     organizationId: input.organizationId,
//     userId:         session.user.id,
//     action:         "UPDATE",
//     entity:         "Application",
//     entityId:       input.applicationId,
//     newValues:      { status: input.status },
//   });

//   revalidatePath("/[orgSlug]/recruitment", "page");
//   return { success: true, data: application };
// }

// export async function getApplications(params: {
//   organizationId: string;
//   jobPostingId?:  string;
//   status?:        ApplicationStatus;
//   search?:        string;
//   page?:          number;
//   perPage?:       number;
// }) {
//   const { organizationId, jobPostingId, status, search, page = 1, perPage = 20 } = params;

//   const where = {
//     organizationId,
//     ...(jobPostingId ? { jobPostingId } : {}),
//     ...(status       ? { status }        : {}),
//     ...(search ? {
//       OR: [
//         { firstName: { contains: search, mode: "insensitive" as const } },
//         { lastName:  { contains: search, mode: "insensitive" as const } },
//         { email:     { contains: search, mode: "insensitive" as const } },
//       ],
//     } : {}),
//   };

//   const [applications, total] = await Promise.all([
//     prisma.application.findMany({
//       where,
//       include: {
//         jobPosting: { select: { id: true, title: true, department: { select: { name: true } } } },
//         interviews: { orderBy: { scheduledAt: "desc" }, take: 1 },
//       },
//       orderBy: { createdAt: "desc" },
//       skip:    (page - 1) * perPage,
//       take:    perPage,
//     }),
//     prisma.application.count({ where }),
//   ]);

//   return { applications, total, page, perPage, totalPages: Math.ceil(total / perPage) };
// }

// export async function getApplication(id: string, organizationId: string) {
//   return prisma.application.findFirst({
//     where:   { id, organizationId },
//     include: {
//       jobPosting: { select: { title: true, type: true, department: { select: { name: true } }, branch: { select: { name: true } } } },
//       interviews: { orderBy: { scheduledAt: "asc" } },
//     },
//   });
// }

// // ── Schedule Interview ───────────────────────────────────────

// export async function scheduleInterview(input: {
//   applicationId:  string;
//   organizationId: string;
//   interviewerId:  string;
//   type:           string;
//   scheduledAt:    string;
//   duration?:      number;
//   location?:      string;
//   meetingLink?:   string;
//   notes?:         string;
// }) {
//   const session = await getSession();
//   if (!session) return { success: false, error: "Unauthorized" };

//   const interview = await prisma.interview.create({
//     data: {
//       applicationId:  input.applicationId,
//       interviewerId:  input.interviewerId,
//       type:           input.type as any,
//       scheduledAt:    new Date(input.scheduledAt),
//       duration:       input.duration    || 60,
//       location:       input.location    || null,
//       meetingLink:    input.meetingLink  || null,
//       notes:          input.notes        || null,
//       status:         "SCHEDULED",
//     },
//   });

//   // Move application to INTERVIEW stage
//   await prisma.application.update({
//     where: { id: input.applicationId },
//     data:  { status: "INTERVIEW" },
//   });

//   revalidatePath("/[orgSlug]/recruitment", "page");
//   return { success: true, data: interview };
// }


"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/actions/audit.actions";
import { createNotification } from "@/actions/notification.actions";
import type { JobPostingStatus, ApplicationStatus } from "@prisma/client";

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

// ── Job Postings ─────────────────────────────────────────────

export async function createJobPosting(input: {
  organizationId: string;
  branchId?:      string;
  departmentId?:  string;
  positionId?:    string;
  title:          string;
  description:    string;
  requirements?:  string;
  responsibilities?: string;
  type:           string;
  location?:      string;
  isRemote?:      boolean;
  salaryMin?:     number;
  salaryMax?:     number;
  currency?:      string;
  openings:       number;
  deadline?:      string;
  experienceMin?: number;
  experienceMax?: number;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    const posting = await prisma.jobPosting.create({
      data: {
        organizationId:   input.organizationId,
        branchId:         input.branchId         || null,
        departmentId:     input.departmentId      || null,
        positionId:       input.positionId        || null,
        title:            input.title,
        description:      input.description,
        requirements:     input.requirements      || null,
        responsibilities: input.responsibilities  || null,
        type:             input.type as any,
        location:         input.location          || null,
        isRemote:         input.isRemote          || false,
        salaryMin:        input.salaryMin          || null,
        salaryMax:        input.salaryMax          || null,
        currency:         input.currency           || "USD",
        openings:         input.openings,
        deadline:         input.deadline ? new Date(input.deadline) : null,
        experienceMin:    input.experienceMin      || null,
        experienceMax:    input.experienceMax      || null,
        status:           "OPEN",
        postedById:       session.user.id,
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

export async function updateJobPostingStatus(id: string, status: JobPostingStatus, organizationId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const posting = await prisma.jobPosting.update({
    where: { id },
    data:  { status, closedAt: status === "CLOSED" ? new Date() : null },
  });

  revalidatePath("/[orgSlug]/recruitment", "page");
  return { success: true, data: posting };
}

export async function getJobPostings(params: {
  organizationId: string;
  branchId?:      string;
  status?:        JobPostingStatus;
  page?:          number;
  perPage?:       number;
}) {
  const { organizationId, branchId, status, page = 1, perPage = 20 } = params;

  const where = {
    organizationId,
    ...(branchId ? { branchId } : {}),
    ...(status    ? { status }   : {}),
  };

  const [postings, total] = await Promise.all([
    prisma.jobPosting.findMany({
      where,
      include: {
        department: { select: { name: true } },
        branch:     { select: { name: true } },
        _count:     { select: { applications: true } },
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
      department: { select: { name: true } },
      branch:     { select: { name: true } },
      position:   { select: { title: true } },
      applications: {
        include: {
          interviews: { orderBy: { scheduledAt: "asc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { applications: true } },
    },
  });
}

// ── Applications ─────────────────────────────────────────────

export async function createApplication(input: {
  jobPostingId:    string;
  organizationId:  string;
  firstName:       string;
  lastName:        string;
  email:           string;
  phone?:          string;
  resumeUrl?:      string;
  coverLetter?:    string;
  linkedinUrl?:    string;
  portfolioUrl?:   string;
  expectedSalary?: number;
  noticePeriod?:   number;
  yearsExperience?: number;
  currentCompany?: string;
  currentRole?:    string;
  source?:         string;
}) {
  try {
    // Check for duplicate application
    const existing = await prisma.application.findFirst({
      where: { jobPostingId: input.jobPostingId, email: input.email },
    });
    if (existing) return { success: false, error: "An application with this email already exists for this position" };

    // Build data with only confirmed schema fields
    const data: Record<string, any> = {
      jobPostingId: input.jobPostingId,
      firstName:    input.firstName,
      lastName:     input.lastName,
      email:        input.email,
      phone:        input.phone       || null,
      resumeUrl:    input.resumeUrl   || null,
      coverLetter:  input.coverLetter || null,
      source:       input.source      || "DIRECT",
      status:       "NEW",
    };

    // Optional fields — only add if they exist in schema
    if (input.linkedinUrl     !== undefined) data.linkedinUrl     = input.linkedinUrl;
    if (input.portfolioUrl    !== undefined) data.portfolioUrl    = input.portfolioUrl;
    if (input.expectedSalary  !== undefined) data.expectedSalary  = input.expectedSalary;
    if (input.noticePeriod    !== undefined) data.noticePeriod    = input.noticePeriod;
    if (input.yearsExperience !== undefined) data.yearsExperience = input.yearsExperience;
    if (input.currentCompany  !== undefined) data.currentCompany  = input.currentCompany;
    if (input.currentRole     !== undefined) data.currentRole     = input.currentRole;

    const application = await prisma.application.create({ data });

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
      notes:  input.notes || null,
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
        jobPosting: { select: { id: true, title: true, department: { select: { name: true } } } },
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
    where:   { id, organizationId },
    include: {
      jobPosting: { select: { title: true, type: true, department: { select: { name: true } }, branch: { select: { name: true } } } },
      interviews: { orderBy: { scheduledAt: "asc" } },
    },
  });
}

// ── Schedule Interview ───────────────────────────────────────

export async function scheduleInterview(input: {
  applicationId:  string;
  organizationId: string;
  interviewerId:  string;
  type:           string;
  scheduledAt:    string;
  duration?:      number;
  location?:      string;
  meetingLink?:   string;
  notes?:         string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const interview = await prisma.interview.create({
    data: {
      applicationId:  input.applicationId,
      interviewerId:  input.interviewerId,
      type:           input.type as any,
      scheduledAt:    new Date(input.scheduledAt),
      duration:       input.duration    || 60,
      location:       input.location    || null,
      meetingLink:    input.meetingLink  || null,
      notes:          input.notes        || null,
      status:         "SCHEDULED",
    },
  });

  // Move application to INTERVIEW stage
  await prisma.application.update({
    where: { id: input.applicationId },
    data:  { status: "INTERVIEW" },
  });

  revalidatePath("/[orgSlug]/recruitment", "page");
  return { success: true, data: interview };
}