import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from 'generated/prisma';

export class ChatInfoDto {
    @ApiProperty({
        description: 'Chat ID',
        example: 'chat123',
    })
    id: string;

    @ApiProperty({
        description: 'Chat title',
        example: 'Team Chat',
    })
    title: string;
}

export class UserInfoDto {
    @ApiProperty({
        description: 'User ID',
        example: 'user456',
    })
    id: string;

    @ApiProperty({
        description: 'Username',
        example: 'john_doe',
    })
    username: string;
}

export class NotificationDto {
    @ApiProperty({
        description: 'Notification ID',
        example: 'notif123',
    })
    id: string;

    @ApiProperty({
        description: 'Chat ID where the notification originated',
        example: 'chat123',
    })
    chatId: string;

    @ApiProperty({
        description: 'ID of user who triggered the notification',
        example: 'user456',
    })
    actorId: string;

    @ApiProperty({
        description: 'ID of user receiving the notification',
        example: 'user123',
    })
    receiverId: string;

    @ApiProperty({
        description: 'Type of notification',
        enum: NotificationType,
        example: NotificationType.NEW_CHAT,
    })
    type: NotificationType;

    @ApiProperty({
        description: 'Additional notification data',
        example: { messageId: 'msg789' },
        type: Object,
        additionalProperties: true,
    })
    data: Record<string, any>;

    @ApiProperty({
        description: 'When the notification was created',
        example: '2023-01-01T12:00:00.000Z',
    })
    createdAt: Date;

    @ApiProperty({
        description: 'Chat information',
        type: ChatInfoDto,
    })
    chat: ChatInfoDto;

    @ApiProperty({
        description: 'Actor (user who triggered) information',
        type: UserInfoDto,
    })
    actor: UserInfoDto;
}

export class PaginatedNotificationsResponseDto {
    @ApiProperty({
        description: 'List of notifications',
        type: [NotificationDto],
    })
    data: NotificationDto[];

    @ApiProperty({
        description: 'Pagination metadata',
        example: {
            nextCursor: 'notif124',
            hasMore: true,
        },
    })
    meta: {
        nextCursor: string | null;
        hasMore: boolean;
    };
}
