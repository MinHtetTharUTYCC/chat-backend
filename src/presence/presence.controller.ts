import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { PresenceService } from './presence.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ChatService } from 'src/chat/chat.service';

@Controller('presence')
export class PresenceController {

    constructor(
        private readonly presenceService: PresenceService,
        private readonly chatService: ChatService
    ) { }

    @Get('/friends')
    @UseGuards(JwtAuthGuard)
    async getOnlineFriends(@Req() req) {
        const friendIds = await this.chatService.getMyFriendsIds(req.user.sub);
        return this.presenceService.getOnlineUsers(friendIds)
    }

    @Get('/:userId')
    @UseGuards(JwtAuthGuard)
    getPresence(@Param('userId') userId: string) {
        return this.presenceService.getPresence(userId)
    }

}

