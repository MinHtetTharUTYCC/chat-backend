import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import type { Cache } from 'cache-manager';

@Injectable()
export class CacheConnectionService implements OnModuleInit {
    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) { }

    async onModuleInit() {

        //OLD Version-5.7.6 works wiith (nest/cache-manager 2.3.0) BUT i need newer version
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


