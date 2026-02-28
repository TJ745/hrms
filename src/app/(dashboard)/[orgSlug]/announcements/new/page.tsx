import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewAnnouncementForm } from "@/components/modules/announcements/new-announcement-form";

export default async function NewAnnouncementPage({
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

  const isHR = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"].includes(user.systemRole);
  if (!isHR) redirect(`/${orgSlug}/announcements`);

  const [branches, departments] = await Promise.all([
    prisma.branch.findMany({
      where:   { organizationId: user.organizationId, isActive: true },
      select:  { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({
      where:   { organizationId: user.organizationId, isActive: true },
      select:  { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">New Announcement</h1>
        <p className="text-sm text-slate-500 mt-0.5">Publish a company-wide or targeted announcement</p>
      </div>
      <NewAnnouncementForm
        organizationId={user.organizationId}
        branches={branches}
        departments={departments}
        orgSlug={orgSlug}
      />
    </div>
  );
}
