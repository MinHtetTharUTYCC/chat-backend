export class BulkPresenceDto {
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
