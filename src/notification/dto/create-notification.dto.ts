import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from 'generated/prisma';
import {
    IsEnum,
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsString,
} from 'class-validator';

export class CreateNotificationDto {
    @ApiProperty({
        description: 'ID of the user receiving the notification',
        example: 'user123',
    })
    @IsNotEmpty()
    @IsString()
    receiverId: string;

    @ApiProperty({
        description: 'Type of notification',
        enum: NotificationType,
        example: NotificationType.NEW_CHAT,
    })
    @IsNotEmpty()
    @IsEnum(NotificationType)
    type: NotificationType;

    @ApiProperty({
        description: 'Additional data for the notification',
        example: { messageId: 'msg123', content: 'Hello!' },
        required: false,
        type: Object,
        additionalProperties: true,
    })
    @IsOptional()
    @IsObject()
    data?: Record<string, any>;
}
