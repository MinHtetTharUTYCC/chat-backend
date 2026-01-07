import { IsString, ArrayNotEmpty, IsArray } from 'class-validator';

export class BulkPresenceDto {
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    userIds: string[];
}

export class PresenceResponseDto {
    userId: string;
    online: boolean;
    lastSeen: string | null;
}

export class BulkPresenceResponseDto {
    [userId: string]: {
        online: boolean;
        lastSeen: string | null;
    };
}
