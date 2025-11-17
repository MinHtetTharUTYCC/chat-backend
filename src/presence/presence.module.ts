import { Module } from '@nestjs/common';
import { PresenceController } from './presence.controller';
import { PresenceService } from './presence.service';

@Module({
  providers: [PresenceService],
  controllers: [PresenceController]
})
export class PresenceModule { }
