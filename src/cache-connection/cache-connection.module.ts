import { Module } from '@nestjs/common';
import { CacheConnectionService } from './cache-connection.service';

@Module({
  providers: [CacheConnectionService]
})
export class CacheConnectionModule {}
