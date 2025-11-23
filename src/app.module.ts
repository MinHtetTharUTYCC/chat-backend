import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { DatabaseModule } from './database/database.module';
import { ChatModule } from './chat/chat.module';
import { MessageModule } from './message/message.module';
import { PresenceModule } from './presence/presence.module';
import { RedisModule } from './redis/redis.module';
import { SearchModule } from './search/search.module';
import { NotificationModule } from './notification/notification.module';
import { CacheModule } from '@nestjs/cache-manager';
import { CacheConnectionModule } from './cache-connection/cache-connection.module';
import { redisStore } from 'cache-manager-redis-yet';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: configService.get<string>("REDIS_HOST") || '127.0.0.1',//'localhost' also works
            port: configService.get<number>("REDIS_PORT") || 6379,
          },
          ttl: 60000,  //globally 1 minutes
        }),
        ttl: 60000, //globally 1 minute
      })
    }),
    AuthModule, UsersModule, DatabaseModule, ChatModule, MessageModule, PresenceModule, RedisModule, SearchModule, NotificationModule, CacheConnectionModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

