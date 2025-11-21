import { NotificationType } from "@prisma/client"
import { IsEnum, IsJSON, IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";

export class CreateNotificationDto {
    @IsNotEmpty()
    @IsString()
    receiverId: string;

    @IsNotEmpty()
    @IsEnum(NotificationType)
    type: NotificationType;

    @IsString()
    @IsOptional()
    pinnedId?: string;

    @IsOptional()
    @IsObject()
    data?: Record<string, any>;
}

