import { Module } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

@Module({
    providers: [DatabaseService]
})
export class MessageModule { }
