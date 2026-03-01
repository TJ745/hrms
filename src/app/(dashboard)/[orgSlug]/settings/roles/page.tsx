import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRoles } from "@/actions/roles.actions";
import { RolesClient } from "@/components/modules/settings/roles-client";

export default async function RolesPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { organizationId: true, systemRole: true },
  });
  if (!user?.organizationId) redirect("/select-org");

  // Only Super Admin and Org Admin
  if (!["SUPER_ADMIN", "ORG_ADMIN"].includes(user.systemRole)) {
    redirect(`/${orgSlug}/dashboard`);
  }

  const [roles, users] = await Promise.all([
    getRoles(user.organizationId),
    prisma.user.findMany({
      where:   { organizationId: user.organizationId },
      select:  {
        id:         true,
        name:       true,
        email:      true,
        systemRole: true,
        roleAssignments: {
          include: { role: { select: { id: true, name: true } } },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <RolesClient
      roles={roles as any}
      users={users as any}
      organizationId={user.organizationId}
      orgSlug={orgSlug}
    />
  );
}
