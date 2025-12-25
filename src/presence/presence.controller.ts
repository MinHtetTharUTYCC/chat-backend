import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { PresenceService } from './presence.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ChatService } from 'src/chat/chat.service';

@Controller('presence')
export class PresenceController {
    constructor(
        private readonly presenceService: PresenceService,
        private readonly chatService: ChatService,
    ) {}

    @Get('/friends')
    @UseGuards(JwtAuthGuard)
    async getOnlineFriends(@Req() req) {
        const friendIds = await this.chatService.getMyFriendsIds(req.user.sub);
        return this.presenceService.getOnlineUsers(friendIds);
    }

    @Post('bulk')
    async getBulkPresence(@Body() body: { userIds: string[] }) {
        return this.presenceService.getBulkPresence(body.userIds);
    }

    @Get('/:userId')
    @UseGuards(JwtAuthGuard)
    getPresence(@Param('userId') userId: string) {
        return this.presenceService.getPresence(userId);
    }
}
