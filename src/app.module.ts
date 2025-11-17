import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { DatabaseModule } from './database/database.module';
import { ChatModule } from './chat/chat.module';
import { MessageService } from './message/message.service';
import { MessageModule } from './message/message.module';
import { DatabaseService } from './database/database.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule, UsersModule, DatabaseModule, ChatModule, MessageModule],
  controllers: [AppController],
  providers: [AppService, MessageService, DatabaseService],
})
export class AppModule { }
