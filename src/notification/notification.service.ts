import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
@Injectable()
export class NotificationService {
    constructor(
        private readonly databaseService: DatabaseService,
    ) { }

    async createNotification(userId: string, chatId: string, dto: CreateNotificationDto) {
        const notification = await this.databaseService.notification.create({
            data: {
                chatId,
                actorId: userId,
                receiverId: dto.receiverId,
                type: dto.type,
                data: dto.data,
                pinnedId: dto.pinnedId,
            },
            include: {
                actor: {
                    select: {
                        id: true,
                        username: true,
                    }
                },
                chat: {
                    select: {
                        id: true,
                        title: true,
                    }
                }
            }
        });

        return notification;
    }

    async getNotifications(userId: string, cursor?: string, limit: number = 20) {
        const notifications = await this.databaseService.notification.findMany({
            where: {
                receiverId: userId,
            },
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
            take: limit,
            orderBy: { createdAt: 'desc' }
        });

        let nextCursor: string | null = null;
        if (notifications.length === limit) {
            nextCursor = notifications[notifications.length - 1].id;
        }

        return {
            data: notifications,
            meta: {
                nextCursor,
                hasMore: nextCursor !== null,
            }
        }
    }
}
