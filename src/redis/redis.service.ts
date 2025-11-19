import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    public client: Redis;

    constructor(private configService: ConfigService) {
        this.client = new Redis({
            host: this.configService.get<string>("REDIS_HOST") || '127.0.0.1',
            port: this.configService.get<number>("REDIS_PORT") || 6379,
            // password: this.configService.get<string>('REDIS_PASSWORD'), TODO: for later
            lazyConnect: true, //wait for .connect() manual call(default: false and autoconnect)
        })
    }

    async onModuleInit() {
        this.client.on('error', (err) => {
            console.error('❌ Redis Client Error:', err);
        })

        this.client.on('connect', () => {
            console.log("✅ Redis connected")
        })

        try {
            await this.client.connect()

        } catch (error) {
            console.error("Could not connect to Redis on startup", error);
        }

    }


    async onModuleDestroy() {
        // this.client.disconnect();

        //.quit() is safer than .disconnect()
        //waits for pending commands to finish before closing
        this.client.quit();
        console.log('❌ Redis connection closed gracefully');

    }
}
