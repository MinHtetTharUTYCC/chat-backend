import { forwardRef, Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../database/database.module';
import { MessageModule } from '../message/message.module';
import { PresenceModule } from '../presence/presence.module';
import { NotificationModule } from '../notification/notification.module';
import { CacheValidatorModule } from '../validator/cache.validator.module';

@Module({
    imports: [
        DatabaseModule,
        NotificationModule,
        CacheValidatorModule,
        forwardRef(() => MessageModule),
        forwardRef(() => PresenceModule),
        JwtModule.register({
            secret: process.env.JWT_ACCESS_SECRET!,
        }),
    ],
    controllers: [ChatController],
    providers: [ChatService, ChatGateway],
    exports: [ChatService, ChatGateway],
})
export class ChatModule {}

