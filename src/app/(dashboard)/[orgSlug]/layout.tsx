import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/shared/sidebar";
import { Topbar } from "@/components/shared/topbar";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) redirect("/login");

  // Verify user belongs to this org
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      organization: {
        select: {
          id: true, name: true, slug: true, logo: true, plan: true,
        },
      },
      employee: {
        select: {
          id: true, firstName: true, lastName: true, avatar: true,
          branch: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
          position: { select: { id: true, title: true } },
        },
      },
    },
  });

  if (!user?.organization || user.organization.slug !== orgSlug) {
    redirect("/select-org");
  }

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      <Sidebar
        orgSlug={orgSlug}
        orgName={user.organization.name}
        orgPlan={user.organization.plan}
        userRole={user.systemRole}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          user={{
            id:     user.id,
            name:   user.name,
            email:  user.email,
            image:  user.image ?? user.employee?.avatar ?? null,
            role:   user.systemRole,
          }}
          orgSlug={orgSlug}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
