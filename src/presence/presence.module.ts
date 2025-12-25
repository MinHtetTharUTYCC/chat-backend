import { forwardRef, Module } from '@nestjs/common';
import { PresenceController } from './presence.controller';
import { PresenceService } from './presence.service';
import { RedisModule } from 'src/redis/redis.module';
import { ChatModule } from 'src/chat/chat.module';

@Module({
    imports: [RedisModule, forwardRef(() => ChatModule)],
    providers: [PresenceService],
    controllers: [PresenceController],
    exports: [PresenceService],
})
export class PresenceModule {}
