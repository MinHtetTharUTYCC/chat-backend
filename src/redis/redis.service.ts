import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
    public client: Redis;

    constructor() {
        this.client = new Redis({
            host: process.env.REDIS_HOST || '127.0.0.1',
            port: Number(process.env.REDIS_PORT) || 6379,
        })

        this.client.on('connect', () => console.log("✅ Redis connected"))
        this.client.on('disconnect', () => console.log("❌ Redis disconnected!!"))
    }

    onModuleDestroy() {
        this.client.disconnect()
    }
}
