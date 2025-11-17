import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { DatabaseService } from 'src/database/database.service';
import { MessageService } from 'src/message/message.service';
import { ChatGateway } from './chat.gateway';
import { JwtService } from '@nestjs/jwt';
import { PresenceService } from 'src/presence/presence.service';

@Module({
  controllers: [ChatController],
  providers: [ChatService, DatabaseService, MessageService, ChatGateway, JwtService, PresenceService]
})
export class ChatModule { }
