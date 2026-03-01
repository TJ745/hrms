import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getExpenseClaims, getExpenseSummary } from "@/actions/expense.actions";
import { ExpensesClient } from "@/components/modules/expenses/expenses-client";

export default async function ExpensesPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where:   { id: session.user.id },
    select:  { organizationId: true, systemRole: true, employee: { select: { id: true } } },
  });
  if (!user?.organizationId) redirect("/select-org");

  const isHR      = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"].includes(user.systemRole);
  const employeeId = isHR ? undefined : (user.employee?.id ?? undefined);

  const [{ claims, total }, summary] = await Promise.all([
    getExpenseClaims({ organizationId: user.organizationId, employeeId }),
    isHR ? getExpenseSummary(user.organizationId) : Promise.resolve(null),
  ]);

  return (
    <ExpensesClient
      claims={claims as any}
      summary={summary}
      isHR={isHR}
      currentEmployeeId={user.employee?.id ?? null}
      organizationId={user.organizationId}
      orgSlug={orgSlug}
    />
  );
}
