import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { DatabaseService } from 'src/database/database.service';
import { MessageService } from 'src/message/message.service';
import { ChatGateway } from './chat.gateway';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [ChatController],
  providers: [ChatService, DatabaseService, MessageService, ChatGateway, JwtService]
})
export class ChatModule { }
