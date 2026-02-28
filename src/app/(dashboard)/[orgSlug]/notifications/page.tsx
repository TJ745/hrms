import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getNotifications, getNotificationPreferences } from "@/actions/notification.actions";
import { NotificationsPageClient } from "@/components/modules/notifications/notifications-page-client";

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [notifications, preferences] = await Promise.all([
    getNotifications(session.user.id, 50),
    getNotificationPreferences(session.user.id),
  ]);

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Notifications</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your notifications and preferences</p>
      </div>
      <NotificationsPageClient
        notifications={notifications}
        preferences={preferences}
        userId={session.user.id}
        orgSlug={orgSlug}
      />
    </div>
  );
}
