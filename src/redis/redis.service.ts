import {
    Injectable,
    OnModuleDestroy,
    OnModuleInit,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    public client: Redis;
    private readonly logger = new Logger(RedisService.name);

    constructor(private configService: ConfigService) {}

    async onModuleInit() {
        const redisConfig = {
            host: this.configService.get<string>('REDIS_HOST') || '127.0.0.1',
            port: this.configService.get<number>('REDIS_PORT') || 6379,
            password: this.configService.get<string>('REDIS_PASSWORD'),
            retryStrategy: (times: number) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            maxRetriesPerRequest: 3,
        };

        if (!redisConfig.password) {
            this.logger.warn('REDIS_PASSWORD not configured!');
        }

        this.logger.log(
            `Connecting to Redis at ${redisConfig.host}:${redisConfig.port}`,
        );

        this.client = new Redis(redisConfig);

        this.client.on('connect', () => {
            this.logger.log('Redis connected');
        });

        this.client.on('ready', () => {
            this.logger.log('Redis client ready');
        });

        this.client.on('error', (err) => {
            this.logger.error('Redis Client Error:', err);
        });

        //test connection
        try {
            await this.client.ping();
            this.logger.log('Redis PING successful');
        } catch (error) {
            this.logger.error('Redis PING failed:', error);
        }
    }

    async onModuleDestroy() {
        //.quit() is safer than .disconnect()
        //waits for pending commands to finish before closing
        await this.client.quit();
        this.logger.log('Redis connection closed gracefully');
    }

    async get(key: string): Promise<string | null> {
        try {
            return await this.client.get(key);
        } catch (error) {
            this.logger.error(`Failed to get key: ${key}`, error);
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
            this.logger.error(`Failed to set key: ${key}`, error);
            throw error;
        }
    }

    async del(...keys: string[]): Promise<number> {
        return this.client.del(...keys);
    }

    async exists(key: string): Promise<number> {
        return this.client.exists(key);
    }
}
