import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PresenceService } from './presence.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ChatService } from 'src/chat/chat.service';
import {
    ApiBearerAuth,
    ApiBody,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import {
    BulkPresenceDto,
    BulkPresenceResponseDto,
    PresenceResponseDto,
} from './dto/response.presence.dto';
import { ReqUser } from 'src/auth/request-user.decorator';
import * as authInterfaces from 'src/auth/interfaces/auth.interfaces';

@ApiTags('presence')
@ApiBearerAuth()
@Controller('presence')
@UseGuards(JwtAuthGuard)
export class PresenceController {
    constructor(
        private readonly presenceService: PresenceService,
        private readonly chatService: ChatService,
    ) {}

    @Get('/friends')
    @ApiOperation({
        summary: 'Get online friends',
        description:
            'Returns a list of online friends for the authenticated user',
    })
    @ApiResponse({
        status: 200,
        description: 'List of online friend IDs',
        type: [String],
        example: ['user123', 'user456'],
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Invalid or missing token',
    })
    async getOnlineFriends(
        @ReqUser() me: authInterfaces.RequestUser,
    ): Promise<string[]> {
        const friendIds = await this.chatService.getMyFriendsIds(me.sub);
        return this.presenceService.getOnlineUsers(friendIds);
    }

    @ApiOperation({
        summary: 'Get bulk presence status',
        description: 'Get presence status for multiple users at once',
    })
    @ApiBody({
        type: BulkPresenceDto,
        description: 'Array of user IDs to check presence for',
        examples: {
            example1: {
                summary: 'Check multiple users',
                value: {
                    userIds: ['user1', 'user2', 'user3'],
                },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Presence status for all requested users',
        type: BulkPresenceResponseDto,
        example: {
            user1: { online: true, lastSeen: null },
            user2: { online: false, lastSeen: '1672531200000' },
            user3: { online: true, lastSeen: null },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid user IDs',
    })
    @Post('bulk')
    async getBulkPresence(
        @Body() body: BulkPresenceDto,
    ): Promise<BulkPresenceResponseDto> {
        return this.presenceService.getBulkPresence(body.userIds);
    }

    @ApiOperation({
        summary: 'Get user presence',
        description: 'Get presence status for a specific user',
    })
    @ApiParam({
        name: 'userId',
        description: 'User ID to check presence for',
        type: String,
        example: 'user123',
    })
    @ApiResponse({
        status: 200,
        description: 'User presence status',
        type: PresenceResponseDto,
        example: {
            userId: 'user123',
            online: true,
            lastSeen: null,
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Invalid or missing token',
    })
    @ApiResponse({
        status: 404,
        description: 'User not found',
    })
    @Get('/:userId')
    getPresence(@Param('userId') userId: string): Promise<PresenceResponseDto> {
        return this.presenceService.getPresence(userId);
    }
}
