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

        // let eventName: string;

        // switch (dto.type) {
        //     case NotificationType.MESSAGE_PINNED:
        //         eventName = "pin_message";
        //         break;
        //     case NotificationType.NEW_CHAT:
        //         eventName = "new_chat";
        //         break;
        //     case NotificationType.GROUP_ADDED:
        //         eventName = 'new_group';
        //         break;
        //     default:
        //         return;
        // }

        // this.chatGateway.server.to(`user_${dto.receiverId}`).emit(eventName, notification);

        return notification;

    }
}
