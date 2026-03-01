"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { sendMail, emailWrapper } from "@/lib/nodemailer";

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function getBillingData(organizationId: string) {
  const [organization, subscription, billingPlans, invoices, employeeCount] = await Promise.all([
    prisma.organization.findUnique({
      where:  { id: organizationId },
      select: { plan: true, name: true, email: true },
    }),
    prisma.subscription.findUnique({
      where: { organizationId },
    }),
    prisma.billingPlan.findMany({
      where:   { isActive: true },
      orderBy: { priceMonthly: "asc" },
    }),
    prisma.invoice.findMany({
      where:   { organizationId },
      orderBy: { createdAt: "desc" },
      take:    10,
    }),
    prisma.employee.count({
      where: { organizationId, status: { in: ["ACTIVE", "PROBATION"] } },
    }),
  ]);

  return { organization, subscription, billingPlans, invoices, employeeCount };
}

export async function requestPlanUpgrade(input: {
  organizationId: string;
  targetPlan:     string;
  billingCycle:   "MONTHLY" | "YEARLY";
  contactName:    string;
  contactEmail:   string;
  notes?:         string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const org = await prisma.organization.findUnique({
    where:  { id: input.organizationId },
    select: { name: true, plan: true },
  });

  try {
    // Send notification email to admin
    const adminEmail = process.env.ADMIN_EMAIL ?? process.env.SMTP_FROM ?? "";

    if (adminEmail) {
      await sendMail({
        to:      adminEmail,
        subject: `Plan Upgrade Request — ${org?.name} → ${input.targetPlan}`,
        html:    emailWrapper(`
          <h2 style="margin-top:0">Plan Upgrade Request</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr><td style="padding:8px 0;color:#6b7280;width:140px">Organisation</td><td style="padding:8px 0;font-weight:600">${org?.name}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280">Current Plan</td><td style="padding:8px 0">${org?.plan}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280">Requested Plan</td><td style="padding:8px 0;font-weight:600;color:#2563eb">${input.targetPlan}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280">Billing Cycle</td><td style="padding:8px 0">${input.billingCycle}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280">Contact Name</td><td style="padding:8px 0">${input.contactName}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280">Contact Email</td><td style="padding:8px 0"><a href="mailto:${input.contactEmail}">${input.contactEmail}</a></td></tr>
            ${input.notes ? `<tr><td style="padding:8px 0;color:#6b7280;vertical-align:top">Notes</td><td style="padding:8px 0">${input.notes}</td></tr>` : ""}
          </table>
          <p style="margin-top:24px;color:#6b7280;font-size:13px">Please contact the customer to process this upgrade.</p>
        `, "Plan Upgrade Request"),
      });
    }

    // Send confirmation email to the requester
    await sendMail({
      to:      input.contactEmail,
      subject: `We received your upgrade request — ${input.targetPlan} Plan`,
      html:    emailWrapper(`
        <h2 style="margin-top:0">Upgrade Request Received</h2>
        <p>Hi ${input.contactName},</p>
        <p>We've received your request to upgrade <strong>${org?.name}</strong> to the <strong>${input.targetPlan}</strong> plan (${input.billingCycle.toLowerCase()} billing).</p>
        <p>Our team will review your request and get back to you within <strong>1 business day</strong> to complete the upgrade and process payment.</p>
        <p>If you have any questions in the meantime, just reply to this email.</p>
        <p style="margin-top:24px;color:#6b7280;font-size:13px">— The HRMS Team</p>
      `, "Upgrade Request Received"),
    });

    revalidatePath("/[orgSlug]/settings/billing", "page");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to send upgrade request" };
  }
}

export async function cancelSubscription(organizationId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  await prisma.subscription.update({
    where: { organizationId },
    data:  { cancelAtPeriodEnd: true },
  });

  revalidatePath("/[orgSlug]/settings/billing", "page");
  return { success: true };
}
