import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import type { Cache } from 'cache-manager';

@Injectable()
export class CacheConnectionService implements OnModuleInit {
    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) { }

    onModuleInit() {
        const cache = this.cacheManager as any;

        const redisClient = cache.store?.client ?? cache.stores[0]?.client ?? cache.client;

        if (redisClient) {
            console.log('✅ REDIS CONNECTION SUCCESSFULLLLLLL');
        } else {
            console.error('❌ REDIS CLIENT NOT FOUND. Printing Cache Object For MORE DETAILS:');
            console.log(Object.keys(cache));
        }


    }
}
