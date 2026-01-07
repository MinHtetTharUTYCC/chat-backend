import { forwardRef, Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { DatabaseModule } from 'src/database/database.module';
import { ChatModule } from 'src/chat/chat.module';
import { NotificationModule } from 'src/notification/notification.module';
import { CacheValidatorModule } from 'src/validator/cache.validator.module';

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
