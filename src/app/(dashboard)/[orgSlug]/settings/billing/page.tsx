import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBillingData } from "@/actions/billing.actions";
import { BillingClient } from "@/components/modules/settings/billing-client";

export default async function BillingPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { organizationId: true, systemRole: true, name: true, email: true },
  });
  if (!user?.organizationId) redirect("/select-org");

  if (!["SUPER_ADMIN", "ORG_ADMIN"].includes(user.systemRole)) {
    redirect(`/${orgSlug}/dashboard`);
  }

  const data = await getBillingData(user.organizationId);

  return (
    <BillingClient
      {...data as any}
      organizationId={user.organizationId}
      orgSlug={orgSlug}
      currentUserName={user.name ?? ""}
      currentUserEmail={user.email ?? ""}
    />
  );
}
