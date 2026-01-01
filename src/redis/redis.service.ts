import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    public client: Redis;

    constructor(private configService: ConfigService) {}

    async onModuleInit() {
        const redisConfig = {
            host: this.configService.get<string>('REDIS_HOST') || '127.0.0.1',
            port: this.configService.get<number>('REDIS_PORT') || 6379,
            // password: this.configService.get<string>('REDIS_PASSWORD'), TODO: for later
            retryStrategy: (times: number) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            maxRetriesPerRequest: 3,
        };

        console.log(
            `🔌 Connecting to Redis at ${redisConfig.host}:${redisConfig.port}`,
        );

        this.client = new Redis(redisConfig);

        this.client.on('connect', () => {
            console.log('✅ Redis connected');
        });

        this.client.on('ready', () => {
            console.log('✅ Redis client ready');
        });

        this.client.on('error', (err) => {
            console.error('❌ Redis Client Error:', err);
        });

        //test connection
        try {
            await this.client.ping();
            console.log('✅ Redis PING successful');
        } catch (error) {
            console.error('❌ Redis PING failed:', error);
        }
    }

    async onModuleDestroy() {
        //.quit() is safer than .disconnect()
        //waits for pending commands to finish before closing
        this.client.quit();
        console.log('❌ Redis connection closed gracefully');
    }

    async get(key: string): Promise<string | null> {
        try {
            return await this.client.get(key);
        } catch (error) {
            console.log('Failed to get key: ', key);
            throw error;
        }
    }

    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        try {
            if (ttlSeconds) {
                await this.client.setex(key, ttlSeconds, value);
            } else {
                await this.client.set(key, value);
            }
        } catch (error) {
            console.log('Failed to set key: ', key);
            throw error;
        }
    }

    async del(...keys: string[]): Promise<number> {
        return this.client.del(keys);
    }

    async exists(key: string): Promise<number> {
        return this.client.exists(key);
    }

    // async expire(key: string, seconds: number): Promise<number> {
    //     return this.client.expire(key, seconds);
    // }

    // async hset(key: string, field: string, value: string): Promise<number> {
    //     return this.client.hset(key, field, value);
    // }

    // async hget(key: string, field: string): Promise<string | null> {
    //     return this.client.hget(key, field);
    // }

    // async hgetall(key: string): Promise<Record<string, string>> {
    //     return this.client.hgetall(key);
    // }
}
