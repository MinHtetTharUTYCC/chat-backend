import { forwardRef, Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from 'src/database/database.module';
import { MessageModule } from 'src/message/message.module';
import { PresenceModule } from 'src/presence/presence.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [
    DatabaseModule,
    NotificationModule,
    forwardRef(() => MessageModule),
    forwardRef(() => PresenceModule),
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET!,
    })],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService, ChatGateway]
})
export class ChatModule { }


