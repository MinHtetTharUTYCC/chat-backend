import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { DatabaseModule } from './database/database.module';
import { ChatModule } from './chat/chat.module';
import { MessageModule } from './message/message.module';
import { PresenceModule } from './presence/presence.module';
import { RedisModule } from './redis/redis.module';
import { SearchModule } from './search/search.module';
import { NotificationModule } from './notification/notification.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        ThrottlerModule.forRoot({
            throttlers: [
                {
                    ttl: 60000,
                    limit: 200,
                },
            ],
        }),
        AuthModule,
        UsersModule,
        DatabaseModule,
        RedisModule,
        ChatModule,
        MessageModule,
        PresenceModule,
        SearchModule,
        NotificationModule,
    ],
    controllers: [AppController],
    providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
