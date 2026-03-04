import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getUserOrganization } from "@/actions/organization.actions";
import { CreateOrgForm } from "@/components/modules/organization/create-org-form";

export default async function SelectOrgPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await getUserOrganization(session.user.id);

  // Already has an org — go straight to dashboard
  if (user?.organization) {
    redirect(`/${user.organization.slug}/dashboard`);
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-10 justify-center">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow shadow-blue-200">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="9" cy="7" r="4" stroke="white" strokeWidth="2" />
              <path
                d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span className="font-semibold text-slate-900 text-lg tracking-tight">
            HRMS
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-900">
              Create your organization
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Set up your workspace. You can invite your team after setup.
            </p>
          </div>
          <div className="px-8 py-6">
            <CreateOrgForm userEmail={session.user.email} />
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-5">
          Signed in as{" "}
          <span className="font-medium text-slate-500">
            {session.user.email}
          </span>
        </p>
      </div>
    </div>
  );
}
