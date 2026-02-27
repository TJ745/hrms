import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLeaveBalances } from "@/actions/leave.actions";
import { NewLeaveRequestForm } from "@/components/modules/leave/new-leave-request-form";

export default async function NewLeaveRequestPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where:   { id: session.user.id },
    include: { employee: true, organization: true },
  });
  if (!user?.organization || !user?.employee) redirect(`/${orgSlug}/leave/requests`);

  const balances = await getLeaveBalances(user.employee.id);

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Request Leave</h1>
        <p className="text-sm text-slate-500 mt-0.5">Submit a new leave request for approval</p>
      </div>
      <NewLeaveRequestForm
        employeeId={user.employee.id}
        balances={balances}
        orgSlug={orgSlug}
      />
    </div>
  );
}
