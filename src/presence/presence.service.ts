import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class PresenceService {
    private readonly logger = new Logger(PresenceService.name);

    // private onlineUsers = new Set<string>();
    constructor(private readonly redisService: RedisService) {}

    async setOnline(userId: string) {
        // ✅ SET ONLINE in Redis
        await this.redisService.client.set(`presence:${userId}`, 'online');
        await this.redisService.client.del(`lastseen:${userId}`);
        await this.redisService.client.expire(`presence:${userId}`, 300); // 5 min TTL
    }

    async setOffline(userId: string) {
        const date = Date.now();
        await this.redisService.client.del(`presence:${userId}`);
        await this.redisService.client.set(`lastseen:${userId}`, date);
    }

    // async setAway(userId: string) {
    //     await this.redisService.client.set(`presence:${userId}`, 'away');
    //     await this.redisService.client.expire(`presence:${userId}`, 300);
    // }

    async heartbeating(userId: string) {
        //Refresh TTL
        await this.redisService.client.expire(`presence:${userId}`, 300); //5 minutes: 300 seconds
    }

    async getPresence(userId: string) {
        const online =
            (await this.redisService.client.get(`presence:${userId}`)) ===
            'online';
        const lastSeen = await this.redisService.client.get(
            `lastseen:${userId}`,
        );
        return {
            userId,
            online,
            lastSeen: lastSeen || null,
        };
    }

    // Maybe later: Save "last seen"
    // async setLastSeen(userId: string) {
    //     await this.redis.client.set(
    //         `lastSeen:${userId}`,
    //         Date.now().toString(),
    //     );
    // }
    // Maybe later: Get 'last seen'
    // async getLastSeen(userId: string) {
    //     return await this.redis.client.get(`lastSeen:${userId}`);
    // }

    async getOnlineUsers(friendIds: string[]): Promise<string[]> {
        if (!friendIds.length) return [];

        const keys = friendIds.map((id) => `presence:${id}`);

        //fetch all online users at once: really FAST(NOT USING loop: SLOW)
        const results = await this.redisService.client.mget(keys);

        const onlineUsers: string[] = [];

        results.forEach((value, idx) => {
            if (value === 'online') {
                onlineUsers.push(friendIds[idx]);
            }
        });

        return onlineUsers;
    }

    async getBulkPresence(userIds: string[]) {
        if (userIds.length === 0) return;

        const pipeline = this.redisService.client.pipeline();

        userIds.forEach((userId) => {
            pipeline.get(`presence:${userId}`);
            pipeline.get(`lastseen:${userId}`);
        });

        const results = await pipeline.exec();

        if (!results) {
            return {};
        }

        const presence: Record<
            string,
            { online: boolean; lastSeen: string | null }
        > = {};

        userIds.forEach((userId, i) => {
            // Redis pipeline returns [error, result] tuples
            const onlineResult = results[i * 2]?.[1];
            const lastSeenResult = results[i * 2 + 1]?.[1];

            // values with type checking
            const onlineValue = onlineResult as string | null;
            const lastSeenValue = lastSeenResult as string | null;

            presence[userId] = {
                online: onlineValue === 'online',
                lastSeen: lastSeenValue,
            };
        });

        return presence;
    }
}
