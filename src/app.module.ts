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

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule, UsersModule, DatabaseModule, ChatModule, MessageModule, PresenceModule, RedisModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
