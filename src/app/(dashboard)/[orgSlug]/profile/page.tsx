import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfilePageClient } from "@/components/modules/profile/profile-page-client";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      employee: {
        include: {
          branch: { select: { name: true } },
          department: { select: { name: true } },
          position: { select: { title: true } },
          salaryHistory: { orderBy: { effectiveDate: "desc" }, take: 1 },
          contracts: {
            where: { status: "ACTIVE" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          bankDetails: { where: { isActive: true, isPrimary: true }, take: 1 },
        },
      },
    },
  });
  if (!user) redirect("/login");

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">My Profile</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage your personal information and preferences
        </p>
      </div>
      <ProfilePageClient
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          systemRole: user.systemRole,
          preferredLanguage: user.preferredLanguage,
          timezone: user.timezone,
        }}
        employee={
          user.employee
            ? {
                id: user.employee.id,
                firstName: user.employee.firstName,
                lastName: user.employee.lastName,
                employeeCode: user.employee.employeeCode,
                hireDate: user.employee.hireDate,
                phone: user.employee.phone,
                personalEmail: user.employee.personalEmail,
                address: user.employee.address,
                city: user.employee.city,
                country: user.employee.country,
                linkedinUrl: user.employee.linkedinUrl,
                dateOfBirth: user.employee.dateOfBirth,
                maritalStatus: user.employee.maritalStatus,
                nationality: user.employee.nationality,
                bloodGroup: user.employee.bloodGroup,
                gender: user.employee.gender,
                status: user.employee.status,
                employmentType: user.employee.employmentType,
                branch: user.employee.branch,
                department: user.employee.department,
                position: user.employee.position,
                currentSalary: user.employee.salaryHistory[0] ?? null,
                activeContract: user.employee.contracts[0] ?? null,
                primaryBank: user.employee.bankDetails[0] ?? null,
              }
            : null
        }
        orgSlug={orgSlug}
      />
    </div>
  );
}
