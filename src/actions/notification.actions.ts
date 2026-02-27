"use server";

import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";
import { emitToUser, SOCKET_EVENTS } from "@/lib/socket";

type CreateNotificationParams = {
  userId:  string;
  type:    NotificationType;
  title:   string;
  body:    string;
  link?:   string;
};

export async function createNotification(params: CreateNotificationParams) {
  const notification = await prisma.notification.create({ data: params });

  // Emit real-time via Socket.io
  try {
    emitToUser(params.userId, SOCKET_EVENTS.NOTIFICATION, {
      id:        notification.id,
      type:      notification.type,
      title:     notification.title,
      body:      notification.body,
      link:      notification.link,
      createdAt: notification.createdAt,
    });
  } catch {
    // Socket may not be available in all contexts
  }

  return notification;
}

export async function markNotificationRead(notificationId: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data:  { isRead: true, readAt: new Date() },
  });
}

export async function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data:  { isRead: true, readAt: new Date() },
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}
