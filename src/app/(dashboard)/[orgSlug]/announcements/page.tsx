import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAnnouncements, getAnnouncementsForEmployee } from "@/actions/announcement.actions";
import { AnnouncementsGrid } from "@/components/modules/announcements/announcements-grid";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function AnnouncementsPage({
  params,
  searchParams,
}: {
  params:       Promise<{ orgSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { orgSlug } = await params;
  const sp          = await searchParams;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where:   { id: session.user.id },
    include: { employee: true },
  });
  if (!user?.organizationId) redirect("/select-org");

  const isHR   = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"].includes(user.systemRole);
  const page   = sp.page ? parseInt(sp.page) : 1;

  const result = isHR
    ? await getAnnouncements({ organizationId: user.organizationId, page })
    : await getAnnouncementsForEmployee({
        organizationId: user.organizationId,
        branchId:       user.employee?.branchId     ?? undefined,
        departmentId:   user.employee?.departmentId ?? undefined,
        page,
      });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Announcements</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isHR ? "Manage company announcements" : "Stay updated with company news"}
          </p>
        </div>
        {isHR && (
          <Link href={`/${orgSlug}/announcements/new`}>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-1.5" /> New Announcement
            </Button>
          </Link>
        )}
      </div>

      <AnnouncementsGrid
        announcements={result.announcements}
        total={result.total}
        page={result.page}
        totalPages={result.totalPages}
        orgSlug={orgSlug}
        organizationId={user.organizationId}
        isHR={isHR}
      />
    </div>
  );
}
