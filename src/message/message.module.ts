import { Module } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { MessageService } from './message.service';
import { DatabaseModule } from 'src/database/database.module';

@Module({
    imports: [DatabaseModule],
    providers: [MessageService],
    exports: [MessageService]

})
export class MessageModule { }
