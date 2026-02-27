import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEmployees } from "@/actions/employee.actions";
import { EmployeeTable } from "@/components/modules/employees/employee-table";
import { Button } from "@/components/ui/button";
import { Plus, Download } from "lucide-react";
import type { EmploymentStatus } from "@prisma/client";

export default async function EmployeesPage({
  params,
  searchParams,
}: {
  params:       Promise<{ orgSlug: string }>;
  searchParams: Promise<{ search?: string; status?: string; dept?: string; page?: string }>;
}) {
  const { orgSlug } = await params;
  const sp          = await searchParams;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { organizationId: true, branchId: true, systemRole: true },
  });
  if (!user?.organizationId) redirect("/select-org");

  const result = await getEmployees({
    organizationId: user.organizationId,
    branchId:       user.systemRole === "HR_MANAGER" ? (user.branchId ?? undefined) : undefined,
    search:         sp.search,
    status:         sp.status as EmploymentStatus | undefined,
    departmentId:   sp.dept,
    page:           sp.page ? parseInt(sp.page) : 1,
    perPage:        20,
  });

  // Department list for filter
  const departments = await prisma.department.findMany({
    where:   { organizationId: user.organizationId, isActive: true },
    select:  { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Employees</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {result.total} total employee{result.total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="border-slate-200 text-slate-600">
            <Download className="w-4 h-4 mr-1.5" /> Export
          </Button>
          <Link href={`/${orgSlug}/employees/new`}>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-1.5" /> Add Employee
            </Button>
          </Link>
        </div>
      </div>

      {/* Table with filters */}
      <EmployeeTable
        employees={result.employees}
        departments={departments}
        total={result.total}
        page={result.page}
        totalPages={result.totalPages}
        orgSlug={orgSlug}
      />
    </div>
  );
}
