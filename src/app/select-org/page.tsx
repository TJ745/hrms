// import { redirect } from "next/navigation";
// import { headers } from "next/headers";
// import Link from "next/link";
// import { auth } from "@/lib/auth";
// import { prisma } from "@/lib/prisma";
// import { Building2, ChevronRight, Plus } from "lucide-react";
// import { Button } from "@/components/ui/button";

// export default async function SelectOrgPage() {
//   const session = await auth.api.getSession({ headers: await headers() });
//   if (!session) redirect("/login");

//   const user = await prisma.user.findUnique({
//     where: { id: session.user.id },
//     include: {
//       organization: {
//         select: {
//           id: true, name: true, slug: true, logo: true, plan: true,
//           _count: { select: { employees: true } },
//         },
//       },
//     },
//   });

//   // If user already has an org, go straight to dashboard
//   if (user?.organization) {
//     redirect(`/${user.organization.slug}/dashboard`);
//   }

//   return (
//     <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
//       <div className="w-full max-w-md">
//         {/* Logo */}
//         <div className="flex items-center gap-2 mb-10 justify-center">
//           <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow shadow-blue-200">
//             <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
//               <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
//               <circle cx="9" cy="7" r="4" stroke="white" strokeWidth="2"/>
//               <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="white" strokeWidth="2" strokeLinecap="round"/>
//             </svg>
//           </div>
//           <span className="font-semibold text-slate-900 text-lg">HRMS</span>
//         </div>

//         <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
//           <h2 className="text-xl font-bold text-slate-900 mb-1">Select your organization</h2>
//           <p className="text-slate-500 text-sm mb-6">Choose a workspace to continue</p>

//           {/* No org state */}
//           <div className="text-center py-8">
//             <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
//               <Building2 className="w-6 h-6 text-slate-400" />
//             </div>
//             <p className="text-slate-600 text-sm mb-6">
//               You&apos;re not part of any organization yet.<br />
//               Create one to get started.
//             </p>
//             <Link href="/register">
//               <Button className="bg-blue-600 hover:bg-blue-700 text-white">
//                 <Plus className="w-4 h-4 mr-2" />
//                 Create organization
//               </Button>
//             </Link>
//           </div>
//         </div>

//         <p className="text-center text-xs text-slate-400 mt-6">
//           Signed in as <span className="font-medium text-slate-500">{session.user.email}</span>
//           {" · "}
//           <button
//             onClick={async () => {
//               "use server";
//               // handled client-side via signOut
//             }}
//             className="text-blue-600 hover:text-blue-700"
//           >
//             Sign out
//           </button>
//         </p>
//       </div>
//     </div>
//   );
// }

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
