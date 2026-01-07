import { forwardRef, Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { DatabaseModule } from '../database/database.module';
import { ChatModule } from '../chat/chat.module';
import { NotificationModule } from '../notification/notification.module';
import { CacheValidatorModule } from '../validator/cache.validator.module';

@Module({
    imports: [
        DatabaseModule,
        NotificationModule,
        CacheValidatorModule,
        forwardRef(() => ChatModule),
    ],
    providers: [MessageService],
    exports: [MessageService],
})
export class MessageModule {}

