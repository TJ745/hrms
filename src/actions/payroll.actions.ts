"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/actions/audit.actions";
import { createNotification } from "@/actions/notification.actions";
import { sendMail, emailTemplates } from "@/lib/nodemailer";

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function getOrCreatePayroll(params: {
  organizationId: string;
  branchId?:      string;
  month:          number;
  year:           number;
}) {
  const { organizationId, branchId, month, year } = params;
  return prisma.payroll.findFirst({
    where: { organizationId, branchId: branchId ?? null, month, year },
    include: {
      payrollItems: {
        include: {
          employee:  { select: { id: true, firstName: true, lastName: true, avatar: true, employeeCode: true, position: { select: { title: true } } } },
          lineItems: true,
        },
        orderBy: { employee: { firstName: "asc" } },
      },
      approvals: true,
    },
  });
}

export async function generatePayroll(params: {
  organizationId: string;
  branchId?:      string;
  month:          number;
  year:           number;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const { organizationId, branchId, month, year } = params;

  const existing = await prisma.payroll.findFirst({
    where: { organizationId, branchId: branchId ?? null, month, year },
  });
  if (existing && existing.status !== "DRAFT") {
    return { success: false, error: "Payroll already processed for this period" };
  }

  const employees = await prisma.employee.findMany({
    where: {
      organizationId,
      ...(branchId ? { branchId } : {}),
      status: { in: ["ACTIVE", "ON_LEAVE"] },
    },
    include: {
      salaryHistory: { orderBy: { effectiveDate: "desc" }, take: 1 },
      bankDetails:   { where: { isPrimary: true }, take: 1 },
    },
  });

  if (employees.length === 0) {
    return { success: false, error: "No active employees found for this period" };
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate   = new Date(year, month, 0);

  let totalWorkingDays = 0;
  const d = new Date(startDate);
  while (d <= endDate) {
    if (d.getDay() !== 0 && d.getDay() !== 6) totalWorkingDays++;
    d.setDate(d.getDate() + 1);
  }

  const settings   = await prisma.payrollSettings.findUnique({ where: { organizationId } });
  const currency   = settings?.currency ?? "USD";
  const components = await prisma.payrollComponent.findMany({ where: { organizationId, isActive: true } });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const payroll = existing ?? await tx.payroll.create({
        data: { organizationId, branchId: branchId ?? null, month, year, currency, status: "DRAFT" },
      });

      if (existing) {
        await tx.payrollLineItem.deleteMany({ where: { payrollItem: { payrollId: payroll.id } } });
        await tx.payrollItem.deleteMany({ where: { payrollId: payroll.id } });
      }

      const items = await Promise.all(
        employees.map(async (emp) => {
          const latestSalary = emp.salaryHistory[0];
          if (!latestSalary) return null;

          const basicSalary = Number(latestSalary.basicSalary);

          const attendance = await tx.attendance.findMany({
            where: { employeeId: emp.id, date: { gte: startDate, lte: endDate } },
          });

          const presentDays    = attendance.filter(a => ["PRESENT","LATE","HALF_DAY","ON_LEAVE"].includes(a.status)).length;
          const overtimeHours  = attendance.reduce((sum, a) => sum + Number(a.overtime ?? 0), 0);
          const dailyRate      = basicSalary / totalWorkingDays;
          const earnedBasic    = dailyRate * presentDays;
          const overtimePay    = (basicSalary / (totalWorkingDays * 8)) * 1.5 * overtimeHours;

          const lineItems: { name: string; type: string; amount: number; isStatutory: boolean }[] = [];
          let totalAllowances = 0;
          let totalDeductions = 0;

          components.forEach((comp) => {
            const amount = comp.calcType === "PERCENTAGE"
              ? (basicSalary * Number(comp.value)) / 100
              : Number(comp.value);
            lineItems.push({ name: comp.name, type: comp.type, amount: Math.round(amount * 100) / 100, isStatutory: comp.isStatutory });
            if (comp.type === "ALLOWANCE" || comp.type === "BONUS") totalAllowances += amount;
            if (comp.type === "DEDUCTION") totalDeductions += amount;
          });

          const loan = await tx.employeeLoan.findFirst({ where: { employeeId: emp.id, status: "ACTIVE" } });
          let loanDeduction = 0;
          if (loan) {
            loanDeduction = Math.min(Number(loan.installment), Number(loan.remainingAmount));
            lineItems.push({ name: "Loan Installment", type: "DEDUCTION", amount: loanDeduction, isStatutory: false });
            totalDeductions += loanDeduction;
            const newRemaining = Number(loan.remainingAmount) - loanDeduction;
            await tx.employeeLoan.update({
              where: { id: loan.id },
              data: { remainingAmount: newRemaining, status: newRemaining <= 0 ? "COMPLETED" : "ACTIVE" },
            });
          }

          const grossSalary = earnedBasic + overtimePay + totalAllowances;
          const netSalary   = grossSalary - totalDeductions;

          return tx.payrollItem.create({
            data: {
              payrollId:       payroll.id,
              employeeId:      emp.id,
              currency:        latestSalary.currency ?? currency,
              basicSalary:     Math.round(earnedBasic    * 100) / 100,
              workingDays:     totalWorkingDays,
              presentDays,
              overtimeHours:   Math.round(overtimeHours  * 100) / 100,
              overtimePay:     Math.round(overtimePay    * 100) / 100,
              grossSalary:     Math.round(grossSalary    * 100) / 100,
              totalDeductions: Math.round(totalDeductions* 100) / 100,
              netSalary:       Math.round(netSalary      * 100) / 100,
              loanDeduction:   Math.round(loanDeduction  * 100) / 100,
              paymentMethod:   emp.bankDetails[0] ? "BANK_TRANSFER" : "CASH",
              lineItems: { createMany: { data: lineItems } },
            },
          });
        })
      );

      return { payroll, itemCount: items.filter(Boolean).length };
    });

    await createAuditLog({
      organizationId, userId: session.user.id, action: "CREATE", entity: "Payroll",
      entityId: result.payroll.id, newValues: { month, year, employeeCount: result.itemCount },
    });

    revalidatePath("/[orgSlug]/payroll", "page");
    return { success: true, data: result };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to generate payroll" };
  }
}

export async function processPayroll(payrollId: string, organizationId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const payroll = await prisma.payroll.findUnique({
    where: { id: payrollId },
    include: {
      payrollItems: {
        include: { employee: { include: { user: { select: { id: true, email: true } } } } },
      },
    },
  });

  if (!payroll) return { success: false, error: "Payroll not found" };
  if (payroll.status === "PAID") return { success: false, error: "Payroll already paid" };

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  await prisma.payroll.update({
    where: { id: payrollId },
    data:  { status: "PAID", processedAt: new Date(), processedBy: session.user.id },
  });

  for (const item of payroll.payrollItems) {
    await createNotification({
      userId: item.employee.user.id,
      type:   "PAYSLIP_READY",
      title:  "Payslip Ready",
      body:   `Your payslip for ${MONTHS[payroll.month - 1]} ${payroll.year} is now available`,
      link:   `/payroll/payslips`,
    });
    try {
      const tpl = emailTemplates.payslipReady(
        item.employee.firstName,
        MONTHS[payroll.month - 1],
        payroll.year,
        `${process.env.NEXT_PUBLIC_APP_URL}/payroll/payslips`,
      );
      await sendMail({ to: item.employee.user.email, ...tpl });
    } catch {}
  }

  await createAuditLog({
    organizationId, userId: session.user.id, action: "PROCESS",
    entity: "Payroll", entityId: payrollId, newValues: { status: "PAID" },
  });

  revalidatePath("/[orgSlug]/payroll", "page");
  return { success: true };
}

export async function getPayrollList(params: {
  organizationId: string;
  branchId?:      string;
  year?:          number;
}) {
  const { organizationId, branchId, year = new Date().getFullYear() } = params;
  return prisma.payroll.findMany({
    where: { organizationId, ...(branchId ? { branchId } : {}), year },
    include: {
      branch:       { select: { name: true } },
      _count:       { select: { payrollItems: true } },
      payrollItems: { select: { netSalary: true, grossSalary: true } },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
}

export async function getPayslip(employeeId: string, month: number, year: number) {
  return prisma.payrollItem.findFirst({
    where: { employeeId, payroll: { month, year, status: "PAID" } },
    include: {
      payroll:   { select: { month: true, year: true, currency: true } },
      lineItems: true,
      employee: {
        select: {
          firstName: true, lastName: true, employeeCode: true, avatar: true,
          position:   { select: { title: true } },
          department: { select: { name: true } },
          branch:     { select: { name: true } },
          user:       { select: { email: true } },
          bankDetails:{ where: { isPrimary: true }, take: 1 },
        },
      },
    },
  });
}

export async function getEmployeePayslips(employeeId: string) {
  return prisma.payrollItem.findMany({
    where:   { employeeId, payroll: { status: "PAID" } },
    include: { payroll: { select: { month: true, year: true, currency: true, status: true } } },
    orderBy: [{ payroll: { year: "desc" } }, { payroll: { month: "desc" } }],
  });
}
