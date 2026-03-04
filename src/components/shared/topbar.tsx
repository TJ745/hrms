import {
  getNotifications,
  getUnreadCount,
} from "@/actions/notification.actions";
import { TopbarClient } from "@/components/shared/topbar-client";
import type { SystemRole } from "@prisma/client";

type Props = {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    role: SystemRole;
  };
  orgSlug: string;
};

export async function Topbar({ user, orgSlug }: Props) {
  const [notifications, unreadCount] = await Promise.all([
    getNotifications(user.id, 15),
    getUnreadCount(user.id),
  ]);

  return (
    <TopbarClient
      user={user}
      orgSlug={orgSlug}
      notifications={notifications}
      unreadCount={unreadCount}
    />
  );
}
