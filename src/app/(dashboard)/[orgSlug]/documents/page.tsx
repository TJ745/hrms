import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPolicyDocuments, getComplianceDocuments } from "@/actions/features.actions";
import { DocumentsClient } from "@/components/modules/documents/documents-client";

export default async function DocumentsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { organizationId: true, systemRole: true },
  });
  if (!user?.organizationId) redirect("/select-org");

  const isHR = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"].includes(user.systemRole);

  const [policyDocs, complianceDocs] = await Promise.all([
    getPolicyDocuments(user.organizationId),
    getComplianceDocuments(user.organizationId),
  ]);

  const serialize = (docs: any[]) => docs.map(d => ({
    ...d,
    publishedAt: d.publishedAt?.toISOString() ?? null,
    expiryDate:  d.expiryDate?.toISOString()  ?? null,
    createdAt:   d.createdAt.toISOString(),
    updatedAt:   d.updatedAt.toISOString(),
  }));

  return (
    <DocumentsClient
      policyDocs={serialize(policyDocs) as any}
      complianceDocs={serialize(complianceDocs) as any}
      isHR={isHR}
      organizationId={user.organizationId}
      orgSlug={orgSlug}
    />
  );
}
