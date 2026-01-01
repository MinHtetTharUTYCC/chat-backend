import { NotificationType } from 'generated/prisma';
import {
    IsEnum,
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsString,
} from 'class-validator';

export class CreateNotificationDto {
    @IsNotEmpty()
    @IsString()
    receiverId: string;

    @IsNotEmpty()
    @IsEnum(NotificationType)
    type: NotificationType;

    @IsOptional()
    @IsObject()
    data?: Record<string, any>;
}
