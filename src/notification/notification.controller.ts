import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationService } from './notification.service';
import { PaginationDto } from '../chat/dto/pagination.dto';
import { ReqUser } from '../auth/request-user.decorator';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { PaginatedNotificationsResponseDto } from './dto/response.notification.dto';
import * as authInterfaces from '../auth/interfaces/auth.interfaces';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}

    @ApiOperation({
        summary: 'Get user notifications',
        description:
            'Retrieve paginated notifications for the authenticated user with cursor-based pagination',
    })
    @ApiQuery({
        name: 'cursor',
        description: 'Cursor for pagination (notification ID to start from)',
        required: false,
        type: String,
        example: 'notif123',
    })
    @ApiQuery({
        name: 'limit',
        description: 'Number of notifications to retrieve (max 50)',
        required: false,
        type: Number,
        example: 20,
    })
    @ApiResponse({
        status: 200,
        description: 'Paginated notifications retrieved successfully',
        type: PaginatedNotificationsResponseDto,
        example: {
            data: [
                {
                    id: 'notif123',
                    chatId: 'chat123',
                    actorId: 'user456',
                    receiverId: 'user123',
                    type: 'MESSAGE',
                    data: { messageId: 'msg789' },
                    createdAt: '2023-01-01T12:00:00.000Z',
                    chat: { id: 'chat123', title: 'Team Chat' },
                    actor: { id: 'user456', username: 'john_doe' },
                },
            ],
            meta: {
                nextCursor: 'notif124',
                hasMore: true,
            },
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Invalid or missing token',
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid pagination parameters',
    })
    @Get('/')
    async getNotifications(
        @ReqUser() me: authInterfaces.RequestUser,
        @Query() query: PaginationDto,
    ) {
        return this.notificationService.getNotifications(
            me.sub,
            query.cursor,
            query.limit,
        );
    }
}

