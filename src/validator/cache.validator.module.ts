import { Module } from '@nestjs/common';
import { CacheValidator } from './cache.validator';

@Module({
    providers: [CacheValidator],
    exports: [CacheValidator],
})
export class CacheValidatorModule {}
