import { MaxLength, MinLength } from 'class-validator';

export class BulkPresenceDto {
    @MinLength(1)
    @MaxLength(100)
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
