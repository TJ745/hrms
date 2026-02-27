import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEmployeeFormOptions } from "@/actions/employee.actions";
import { AddEmployeeForm } from "@/components/modules/employees/add-employee-form";

export default async function NewEmployeePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { organizationId: true, systemRole: true },
  });
  if (!user?.organizationId) redirect("/select-org");

  // Only admins and HR managers can add employees
  if (!["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"].includes(user.systemRole)) {
    redirect(`/${orgSlug}/employees`);
  }

  const options = await getEmployeeFormOptions(user.organizationId);

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Add New Employee</h1>
        <p className="text-sm text-slate-500 mt-0.5">Fill in the details to create a new employee account</p>
      </div>
      <AddEmployeeForm options={options} orgSlug={orgSlug} />
    </div>
  );
}
