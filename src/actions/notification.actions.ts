// "use server";

// import { prisma } from "@/lib/prisma";
// import { NotificationType } from "@prisma/client";
// import { emitToUser, SOCKET_EVENTS } from "@/lib/socket";

// type CreateNotificationParams = {
//   userId:  string;
//   type:    NotificationType;
//   title:   string;
//   body:    string;
//   link?:   string;
// };

// export async function createNotification(params: CreateNotificationParams) {
//   const notification = await prisma.notification.create({ data: params });

//   // Emit real-time via Socket.io
//   try {
//     emitToUser(params.userId, SOCKET_EVENTS.NOTIFICATION, {
//       id:        notification.id,
//       type:      notification.type,
//       title:     notification.title,
//       body:      notification.body,
//       link:      notification.link,
//       createdAt: notification.createdAt,
//     });
//   } catch {
//     // Socket may not be available in all contexts
//   }

//   return notification;
// }

// export async function markNotificationRead(notificationId: string, userId: string) {
//   return prisma.notification.updateMany({
//     where: { id: notificationId, userId },
//     data:  { isRead: true, readAt: new Date() },
//   });
// }

// export async function markAllNotificationsRead(userId: string) {
//   return prisma.notification.updateMany({
//     where: { userId, isRead: false },
//     data:  { isRead: true, readAt: new Date() },
//   });
// }

// export async function getUnreadCount(userId: string) {
//   return prisma.notification.count({
//     where: { userId, isRead: false },
//   });
// }


"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { NotificationType } from "@prisma/client";

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function createNotification(input: {
  userId: string;
  type:   NotificationType;
  title:  string;
  body:   string;
  link?:  string;
}) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type:   input.type,
      title:  input.title,
      body:   input.body,
      link:   input.link || null,
    },
  });
}

export async function getNotifications(userId: string, limit = 20) {
  return prisma.notification.findMany({
    where:   { userId },
    orderBy: { createdAt: "desc" },
    take:    limit,
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

export async function markNotificationRead(id: string) {
  const session = await getSession();
  if (!session) return { success: false };

  await prisma.notification.update({
    where: { id },
    data:  { isRead: true, readAt: new Date() },
  });

  revalidatePath("/", "layout");
  return { success: true };
}

export async function markAllNotificationsRead(userId: string) {
  const session = await getSession();
  if (!session) return { success: false };

  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data:  { isRead: true, readAt: new Date() },
  });

  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteNotification(id: string) {
  const session = await getSession();
  if (!session) return { success: false };

  await prisma.notification.delete({ where: { id } });
  revalidatePath("/", "layout");
  return { success: true };
}

export async function getNotificationPreferences(userId: string) {
  return prisma.notificationPreference.findMany({
    where: { userId },
  });
}

export async function upsertNotificationPreference(input: {
  userId: string;
  type:   NotificationType;
  inApp:  boolean;
  email:  boolean;
}) {
  await prisma.notificationPreference.upsert({
    where:  { userId_type: { userId: input.userId, type: input.type } },
    create: { userId: input.userId, type: input.type, inApp: input.inApp, email: input.email },
    update: { inApp: input.inApp, email: input.email },
  });

  return { success: true };
}
