import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { PresenceService } from './presence.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('presence')
export class PresenceController {

    constructor(private readonly presenceService: PresenceService) { }

    @Get('/friends') //chats with history
    @UseGuards(JwtAuthGuard)
    getOnlineFriends(@Req() req) {
        // const userId = req.user.sub;
        //for now return all users, we need to filter to return only friends
        return this.presenceService.getOnlineUsers();
    }

    @Get('/:userId')
    @UseGuards(JwtAuthGuard)
    getPresence(@Param('userId') userId: string) {
        return { online: this.presenceService.isOnline(userId) }
    }





}
