import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLeaveRequests, getLeaveBalances } from "@/actions/leave.actions";
import { LeaveRequestsTable } from "@/components/modules/leave/leave-requests-table";
import { LeaveBalanceCards } from "@/components/modules/leave/leave-balance-cards";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function LeaveRequestsPage({
  params,
  searchParams,
}: {
  params:       Promise<{ orgSlug: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { orgSlug } = await params;
  const sp          = await searchParams;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where:   { id: session.user.id },
    include: { employee: true, organization: true },
  });
  if (!user?.organization) redirect("/select-org");

  const isHR = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"].includes(user.systemRole);

  const [result, balances] = await Promise.all([
    getLeaveRequests({
      organizationId: user.organization.id,
      branchId:       user.systemRole === "HR_MANAGER" ? (user.branchId ?? undefined) : undefined,
      employeeId:     isHR ? undefined : (user.employee?.id ?? undefined),
      status:         sp.status,
      page:           sp.page ? parseInt(sp.page) : 1,
    }),
    user.employee ? getLeaveBalances(user.employee.id) : [],
  ]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Leave</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isHR ? "Manage leave requests" : "Your leave requests & balances"}
          </p>
        </div>
        {user.employee && (
          <Link href={`/${orgSlug}/leave/new`}>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-1.5" /> Request Leave
            </Button>
          </Link>
        )}
      </div>

      {/* Leave balance cards */}
      {balances.length > 0 && (
        <LeaveBalanceCards balances={balances} />
      )}

      {/* Requests table */}
      <LeaveRequestsTable
        requests={result.requests}
        total={result.total}
        page={result.page}
        totalPages={result.totalPages}
        orgSlug={orgSlug}
        isHR={isHR}
        organizationId={user.organization.id}
      />
    </div>
  );
}
