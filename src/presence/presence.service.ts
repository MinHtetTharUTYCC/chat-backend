import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class PresenceService {
    // private onlineUsers = new Set<string>();
    constructor(private readonly redisService: RedisService) { }

    async setOnline(userId: string) {
        await this.redisService.client.set(`presence:${userId}`, 'online')
    }

    async setOffline(userId: string) {
        await this.redisService.client.del(`presence:${userId}`);
        await this.redisService.client.set(`lastseen:${userId}`, Date.now().toString())
    }

    async getPresence(userId: string) {
        const online = await this.redisService.client.get(`presence:${userId}`) === 'online';
        const lastSeen = await this.redisService.client.get(`lastseen:${userId}`);
        return {
            userId,
            online,
            lastSeen: lastSeen ? Number(lastSeen) : null
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

        const keys = friendIds.map(id => `presence:${id}`)

        //fetch all online users at once: really FAST(NOT USING loop: SLOW)
        const results = await this.redisService.client.mget(keys);

        const onlineUsers: string[] = [];

        results.forEach((value, idx) => {
            if (value === 'online') {
                onlineUsers.push(friendIds[idx])
            }
        });

        return onlineUsers;
    }
}
