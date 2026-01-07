import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search.dto';
import { ReqUser } from '../auth/request-user.decorator';
import {
    MessageSearchResultDto,
    SearchChatsResponseDto,
} from './dto/search.response.dto';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import * as authInterfaces from '../auth/interfaces/auth.interfaces';

@ApiTags('search')
@ApiBearerAuth()
@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
    constructor(private readonly searchService: SearchService) {}

    @Get('/')
    @ApiOperation({
        summary: 'Search users and groups',
        description:
            'Search for users (by username/email) and groups (by title) that the authenticated user has access to',
    })
    @ApiQuery({
        name: 'q',
        description: 'Search query string',
        required: true,
        type: String,
        example: 'john',
    })
    @ApiResponse({
        status: 200,
        description: 'Search results for users and groups',
        type: SearchChatsResponseDto,
        example: {
            users: [
                { id: 'user123', username: 'john_doe' },
                { id: 'user456', username: 'john_smith' },
            ],
            groups: [
                { id: 'chat123', title: "John's Team" },
                { id: 'chat456', title: 'Project John' },
            ],
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Invalid or missing token',
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid search query',
    })
    async searchChats(
        @ReqUser() me: authInterfaces.RequestUser,
        @Query() dto: SearchQueryDto,
    ): Promise<SearchChatsResponseDto> {
        return this.searchService.searchChats(me.sub, dto.q);
    }

    @Get('/chats/:chatId')
    @ApiOperation({
        summary: 'Search messages in a specific chat',
        description:
            'Search for messages containing specific text within a chat that the user is a member of',
    })
    @ApiParam({
        name: 'chatId',
        description: 'Chat ID to search within',
        type: String,
        example: 'chat123',
    })
    @ApiQuery({
        name: 'q',
        description: 'Search query string',
        required: true,
        type: String,
        example: 'hello world',
    })
    @ApiResponse({
        status: 200,
        description: 'Messages containing the search query',
        type: [MessageSearchResultDto],
        example: [
            {
                id: 'msg123',
                content: 'Hello world! How are you?',
                createdAt: '2023-01-01T12:00:00.000Z',
                sender: { id: 'user123', username: 'john_doe' },
            },
            {
                id: 'msg456',
                content: 'World news today...',
                createdAt: '2023-01-01T11:30:00.000Z',
                sender: { id: 'user456', username: 'jane_smith' },
            },
        ],
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Invalid or missing token',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User is not a member of the chat',
    })
    @ApiResponse({
        status: 404,
        description: 'Chat not found',
    })
    async searchInMessages(
        @ReqUser() me: authInterfaces.RequestUser,
        @Param('chatId') chatId: string,
        @Query() dto: SearchQueryDto,
    ): Promise<MessageSearchResultDto[]> {
        return this.searchService.searchMessageInChat(me.sub, chatId, dto.q);
    }
}

