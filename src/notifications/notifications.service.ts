import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

/* eslint-disable @typescript-eslint/no-var-requires */
const { getMessaging } = require('firebase-admin/messaging');
/* eslint-enable */

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async notify({
    userId,
    senderId,
    type,
    title,
    body,
    data = {},
  }: {
    userId: string;
    senderId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, string>;
  }) {
    if (userId === senderId) return;

    const notification = await this.prisma.notification.create({
      data: { userId, senderId, type, title, body, data },
    });

    await this._sendPush(userId, title, body, { ...data, notificationId: notification.id });
    return notification;
  }

  async notifyConcertTag(senderId: string, recipientId: string, concertName: string, concertId: string) {
    const sender = await this._getSenderName(senderId);
    return this.notify({
      userId: recipientId,
      senderId,
      type: NotificationType.CONCERT_TAG,
      title: '🎸 Te etiquetaron en un concierto',
      body: `${sender} te etiquetó en "${concertName}"`,
      data: { concertId },
    });
  }

  async notifyPhotoTag(senderId: string, recipientId: string, concertName: string, photoId: string, concertId: string) {
    const sender = await this._getSenderName(senderId);
    return this.notify({
      userId: recipientId,
      senderId,
      type: NotificationType.PHOTO_TAG,
      title: '📸 Te etiquetaron en una foto',
      body: `${sender} te etiquetó en una foto de "${concertName}"`,
      data: { photoId, concertId },
    });
  }

  async notifyFriendRequest(senderId: string, recipientId: string) {
    const sender = await this._getSenderName(senderId);
    return this.notify({
      userId: recipientId,
      senderId,
      type: NotificationType.FRIEND_REQUEST,
      title: '👋 Nueva solicitud de amistad',
      body: `${sender} quiere ser tu amigo`,
      data: { senderId },
    });
  }

  async notifyFriendAccepted(senderId: string, recipientId: string) {
    const sender = await this._getSenderName(senderId);
    return this.notify({
      userId: recipientId,
      senderId,
      type: NotificationType.FRIEND_ACCEPTED,
      title: '✅ Solicitud aceptada',
      body: `${sender} aceptó tu solicitud de amistad`,
      data: { senderId },
    });
  }

  async notifyFriendConcert(senderId: string, concertName: string, concertId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ senderId }, { receiverId: senderId }],
      },
    });

    const sender = await this._getSenderName(senderId);

    for (const fs of friendships) {
      const recipientId = fs.senderId === senderId ? fs.receiverId : fs.senderId;
      await this.notify({
        userId: recipientId,
        senderId,
        type: NotificationType.FRIEND_CONCERT,
        title: '🎵 Tu amigo fue a un concierto',
        body: `${sender} añadió "${concertName}"`,
        data: { concertId },
      });
    }
  }

  async getAll(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, read: false },
    });
    return { count };
  }

  async markRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async saveToken(userId: string, token: string, platform: string) {
    return this.prisma.deviceToken.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId },
    });
  }

  async removeToken(token: string) {
    return this.prisma.deviceToken.deleteMany({ where: { token } });
  }

  private async _sendPush(
    userId: string,
    title: string,
    body: string,
    data: Record<string, string>,
  ) {
    const tokens = await this.prisma.deviceToken.findMany({
      where: { userId },
      select: { token: true },
    });

    if (!tokens.length) return;

    const tokenList = tokens.map((t: any) => t.token);

    try {
      const response = await getMessaging().sendEachForMulticast({
        tokens: tokenList,
        notification: { title, body },
        data,
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default', badge: 1 } } },
      });

      response.responses.forEach(async (res: any, idx: number) => {
        if (!res.success && res.error?.code === 'messaging/registration-token-not-registered') {
          await this.prisma.deviceToken.deleteMany({ where: { token: tokenList[idx] } });
        }
      });
    } catch (e) {
      this.logger.warn(`Push error: ${e}`);
    }
  }

  private async _getSenderName(senderId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: senderId },
      select: { name: true },
    });
    return user?.name ?? 'Alguien';
  }
}