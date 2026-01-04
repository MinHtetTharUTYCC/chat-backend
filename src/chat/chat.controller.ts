import {
    Body,
    Controller,
    Delete,
    Get,
    Logger,
    Param,
    Patch,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { StartChatDto } from './dto/startChat.dto';
import { SendMessageDto } from './dto/sendMessage.dto';
import { MessageService } from 'src/message/message.service';
import { UpdateChatTitleDto } from './dto/update-chat-title.dto';
import { AddToChatDto } from './dto/add-to-chat.dto';
import { CreateGroupChatDto } from './dto/create-group-chat.dto';
import { EditMessageDto } from './dto/edit-message.dto';
import { PaginationDto } from './dto/pagination.dto';
import { MessagesPaginationDto } from './dto/messages-pagination.dto';
import type { RequestUser } from 'src/auth/interfaces/request-user.interface';
import { ReqUser } from 'src/auth/request-user.decorator';
import { InviteToChatDto } from './dto/invite-to-chat.dto';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
    ApiParam,
    ApiQuery,
} from '@nestjs/swagger';
import {
    GetAllChatsResponseDto,
    GetMyChatsIdsResponseDto,
    StartChatResponseDto,
    FullChatDto,
    PreviewChatDto,
    UpdateChatTitleResponseDto,
    CreateGroupChatResponseDto,
    AddToGroupChatResponseDto,
    InviteToGroupResponseDto,
    JoinGroupResponseDto,
    LeaveGroupResponseDto,
    SearchUsersToInviteResponseDto,
    ChatListItemDto,
} from './dto/chat-response.dto';
import {
    GetMessagesResponseDto,
    SendMessageResponseDto,
    DeleteMessageResponseDto,
    EditMessageResponseDto,
    GetPinnedMessagesResponseDto,
    PinMessageResponseDto,
    UnpinMessageResponseDto,
} from './dto/message-response.dto';

@ApiTags('chats')
@ApiBearerAuth()
@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatController {
    private readonly logger = new Logger(ChatController.name);

    constructor(
        private readonly chatService: ChatService,
        private readonly messageService: MessageService,
    ) {}

    @Get()
    @ApiOperation({ summary: 'Get all chats for the current user' })
    @ApiResponse({
        status: 200,
        description: 'List of all chats the user participates in',
        type: [ChatListItemDto],
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized',
    })
    async getAllChats(@Req() req) {
        return this.chatService.getAllChats(req.user.sub);
    }

    @Get('my-chats-ids')
    @ApiOperation({ summary: 'Get IDs of all chats the user participates in' })
    @ApiResponse({
        status: 200,
        description: 'Array of chat IDs',
        type: [String],
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized',
    })
    async getMyChatsIds(@Req() req) {
        return this.chatService.getMyChatsIds(req.user.sub);
    }

    @Post('start')
    @ApiOperation({ summary: 'Start a direct message chat with another user' })
    @ApiResponse({
        status: 201,
        description: 'Chat started successfully',
        type: StartChatResponseDto,
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - cannot chat with yourself',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized',
    })
    @ApiResponse({
        status: 404,
        description: 'User not found',
    })
    async startChat(@Req() req, @Body() startChatDto: StartChatDto) {
        return this.chatService.startChat(
            req.user.sub,
            startChatDto.otherUserId,
        );
    }

    @Get(':chatId/messages')
    @ApiParam({
        name: 'chatId',
        description: 'The ID of the chat',
        type: 'string',
    })
    @ApiQuery({
        name: 'prevCursor',
        required: false,
        description: 'Cursor for loading newer messages',
    })
    @ApiQuery({
        name: 'nextCursor',
        required: false,
        description: 'Cursor for loading older messages',
    })
    @ApiQuery({
        name: 'aroundMessageId',
        required: false,
        description:
            'Message ID to load messages around (for pinned or search)',
    })
    @ApiQuery({
        name: 'aroundDate',
        required: false,
        description: 'Timestamp to load messages around',
        type: 'number',
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        description: 'Number of messages to load (default: 20)',
        type: 'number',
    })
    @ApiOperation({
        summary: 'Get messages for a specific chat with pagination support',
    })
    @ApiResponse({
        status: 200,
        description: 'Messages retrieved successfully',
        type: GetMessagesResponseDto,
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - not a member of this chat',
    })
    @ApiResponse({
        status: 404,
        description: 'Chat or message not found',
    })
    async getMessages(
        @Req() req,
        @Param('chatId') chatId: string,
        @Query()
        query: MessagesPaginationDto,
    ) {
        return this.messageService.getMessages(
            req.user.sub,
            chatId,
            {
                prevCursor: query.prevCursor,
                nextCursor: query.nextCursor,
                aroundMessageId: query.aroundMessageId,
                aroundDate: query.aroundDate,
            },
            query.limit,
        );
    }

    @Post(':chatId/messages')
    @ApiParam({
        name: 'chatId',
        description: 'The ID of the chat',
        type: 'string',
    })
    @ApiOperation({ summary: 'Send a message to a chat' })
    @ApiResponse({
        status: 201,
        description: 'Message sent successfully',
        type: SendMessageResponseDto,
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - not a member of this chat',
    })
    @ApiResponse({
        status: 404,
        description: 'Chat not found',
    })
    async sendMessage(
        @Req() req,
        @Param('chatId') chatId: string,
        @Body() sendMessageDto: SendMessageDto,
    ) {
        return this.messageService.sendMessage(
            req.user.sub,
            chatId,
            sendMessageDto.content,
        );
    }

    @Get(':chatId')
    @ApiParam({
        name: 'chatId',
        description: 'The ID of the chat',
        type: 'string',
    })
    @ApiOperation({ summary: 'View a specific chat (full or preview)' })
    @ApiResponse({
        status: 200,
        description:
            'Chat retrieved successfully. Returns FullChatDto if user is participant, PreviewChatDto otherwise',
        schema: {
            oneOf: [
                { $ref: '#/components/schemas/FullChatDto' },
                { $ref: '#/components/schemas/PreviewChatDto' },
            ],
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - cannot view private chats of others',
    })
    @ApiResponse({
        status: 404,
        description: 'Chat not found',
    })
    async viewChat(@Req() req, @Param('chatId') chatId: string) {
        this.logger.debug(`Viewing chat: ${chatId} for user: ${req.user.sub}`);
        return this.chatService.viewChat(req.user.sub, chatId);
    }

    @Delete(':chatId/messages/:messageId')
    @ApiParam({
        name: 'chatId',
        description: 'The ID of the chat',
        type: 'string',
    })
    @ApiParam({
        name: 'messageId',
        description: 'The ID of the message to delete',
        type: 'string',
    })
    @ApiOperation({ summary: 'Delete a message (only sender can delete)' })
    @ApiResponse({
        status: 200,
        description: 'Message deleted successfully',
        type: DeleteMessageResponseDto,
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - not a member of this chat or not the sender',
    })
    @ApiResponse({
        status: 404,
        description: 'Chat or message not found',
    })
    async deleteMessage(
        @Req() req,
        @Param('chatId') chatId: string,
        @Param('messageId') messageId: string,
    ) {
        return this.messageService.deleteMessage(
            req.user.sub,
            chatId,
            messageId,
        );
    }

    @Patch(':chatId/messages/:messageId')
    @ApiParam({
        name: 'chatId',
        description: 'The ID of the chat',
        type: 'string',
    })
    @ApiParam({
        name: 'messageId',
        description: 'The ID of the message to edit',
        type: 'string',
    })
    @ApiOperation({ summary: 'Edit a message (only sender can edit)' })
    @ApiResponse({
        status: 200,
        description: 'Message edited successfully',
        type: EditMessageResponseDto,
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - not a member of this chat or not the sender',
    })
    @ApiResponse({
        status: 404,
        description: 'Chat or message not found',
    })
    async editMessage(
        @ReqUser() me: RequestUser,
        @Param('chatId') chatId: string,
        @Param('messageId') messageId: string,
        @Body() dto: EditMessageDto,
    ) {
        return this.messageService.editMessage(
            me,
            chatId,
            messageId,
            dto.content,
        );
    }

    @Get(':chatId/pinned')
    @ApiParam({
        name: 'chatId',
        description: 'The ID of the chat',
        type: 'string',
    })
    @ApiQuery({
        name: 'cursor',
        required: false,
        description: 'Cursor for pagination',
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        description: 'Number of pinned messages to load (default: 20)',
        type: 'number',
    })
    @ApiOperation({ summary: 'Get pinned messages in a chat' })
    @ApiResponse({
        status: 200,
        description: 'Pinned messages retrieved successfully',
        type: GetPinnedMessagesResponseDto,
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - not a member of this chat',
    })
    @ApiResponse({
        status: 404,
        description: 'Chat not found',
    })
    async getPinnedMessages(
        @ReqUser() user: RequestUser,
        @Param('chatId') chatId: string,
        @Query() dto: PaginationDto,
    ) {
        return this.messageService.getPinnedMessages(
            user.sub,
            chatId,
            dto.cursor,
            dto.limit,
        );
    }

    @Post(':chatId/messages/:messageId/pin')
    @ApiParam({
        name: 'chatId',
        description: 'The ID of the chat',
        type: 'string',
    })
    @ApiParam({
        name: 'messageId',
        description: 'The ID of the message to pin',
        type: 'string',
    })
    @ApiOperation({ summary: 'Pin a message in a chat' })
    @ApiResponse({
        status: 201,
        description: 'Message pinned successfully',
        type: PinMessageResponseDto,
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - not a member of this chat',
    })
    @ApiResponse({
        status: 404,
        description: 'Chat or message not found',
    })
    @ApiResponse({
        status: 409,
        description: 'Message is already pinned',
    })
    async pinMessage(
        @ReqUser() user: RequestUser,
        @Param('chatId') chatId: string,
        @Param('messageId') messageId: string,
    ) {
        return this.messageService.pinMessage(
            user.sub,
            user.username,
            chatId,
            messageId,
        );
    }

    @Delete(':chatId/messages/:messageId/pin')
    @ApiParam({
        name: 'chatId',
        description: 'The ID of the chat',
        type: 'string',
    })
    @ApiParam({
        name: 'messageId',
        description: 'The ID of the message to unpin',
        type: 'string',
    })
    @ApiOperation({
        summary: 'Unpin a message (pin creator or message owner can unpin)',
    })
    @ApiResponse({
        status: 200,
        description: 'Message unpinned successfully',
        type: UnpinMessageResponseDto,
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized',
    })
    @ApiResponse({
        status: 403,
        description:
            'Forbidden - not a member of this chat or not the pin creator/message owner',
    })
    @ApiResponse({
        status: 404,
        description: 'Chat, message, or pin not found',
    })
    async unpinMessage(
        @Req() req,
        @Param('chatId') chatId: string,
        @Param('messageId') messageId: string,
    ) {
        return this.messageService.unpinMessage(
            req.user.sub,
            chatId,
            messageId,
        );
    }

    @Patch(':chatId/update-title')
    @ApiParam({
        name: 'chatId',
        description: 'The ID of the chat',
        type: 'string',
    })
    @ApiOperation({ summary: 'Update chat title (group chats only)' })
    @ApiResponse({
        status: 200,
        description: 'Chat title updated successfully',
        type: UpdateChatTitleResponseDto,
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - not a member of this chat or direct message',
    })
    @ApiResponse({
        status: 404,
        description: 'Chat not found',
    })
    async updateChatTitle(
        @ReqUser() me: RequestUser,
        @Param('chatId') chatId: string,
        @Body() dto: UpdateChatTitleDto,
    ) {
        return this.chatService.updateChatTitle(me, chatId, dto.title);
    }

    @Post('create-group')
    @ApiOperation({ summary: 'Create a new group chat' })
    @ApiResponse({
        status: 201,
        description: 'Group chat created successfully',
        type: CreateGroupChatResponseDto,
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - group must have at least one other member',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized',
    })
    async createGroupChat(
        @ReqUser() me: RequestUser,
        @Body() dto: CreateGroupChatDto,
    ) {
        return this.chatService.createGroupChat(me, dto.title, dto.userIds);
    }

    @Post(':chatId/participants')
    @ApiParam({
        name: 'chatId',
        description: 'The ID of the chat',
        type: 'string',
    })
    @ApiOperation({
        summary: 'Add members to a group chat (they automatically join)',
    })
    @ApiResponse({
        status: 201,
        description: 'Members added successfully',
        type: AddToGroupChatResponseDto,
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - no valid users to add',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - not a member of this chat or direct message',
    })
    @ApiResponse({
        status: 404,
        description: 'Chat not found',
    })
    async addToGroupChat(
        @ReqUser() me: RequestUser,
        @Param('chatId') chatId: string,
        @Body() dto: AddToChatDto,
    ) {
        return this.chatService.addToGroupChat(me, chatId, dto.userIds);
    }

    @Post(':chatId/participants/invite')
    @ApiParam({
        name: 'chatId',
        description: 'The ID of the chat',
        type: 'string',
    })
    @ApiOperation({
        summary: 'Invite members to a group chat (they must accept invitation)',
    })
    @ApiResponse({
        status: 201,
        description: 'Invitation sent successfully',
        type: InviteToGroupResponseDto,
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - no valid users to invite',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - not a member of this chat or direct message',
    })
    @ApiResponse({
        status: 404,
        description: 'Chat not found',
    })
    async inviteToGroup(
        @ReqUser() me: RequestUser,
        @Param('chatId') chatId: string,
        @Body() dto: InviteToChatDto,
    ) {
        return this.chatService.inviteToGroupChat(me, chatId, dto.userIds);
    }

    @Get(':chatId/invite-users')
    @ApiParam({
        name: 'chatId',
        description: 'The ID of the chat',
        type: 'string',
    })
    @ApiQuery({
        name: 'q',
        required: false,
        description: 'Search query for username or email',
    })
    @ApiOperation({
        summary: 'Search for users that can be invited to a group chat',
    })
    @ApiResponse({
        status: 200,
        description: 'Available users retrieved successfully',
        type: SearchUsersToInviteResponseDto,
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - not a member of this chat',
    })
    @ApiResponse({
        status: 404,
        description: 'Chat not found or not a group',
    })
    async searchUsersToInvite(
        @ReqUser() me: RequestUser,
        @Param('chatId') chatId: string,
        @Query('q') q: string,
    ) {
        return this.chatService.searchUsersToInvite(me, chatId, q);
    }

    @Post(':chatId/participants/join-group')
    @ApiParam({
        name: 'chatId',
        description: 'The ID of the chat',
        type: 'string',
    })
    @ApiOperation({ summary: 'Join a group chat (for accepting invitations)' })
    @ApiResponse({
        status: 201,
        description: 'Successfully joined the group',
        type: JoinGroupResponseDto,
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized',
    })
    @ApiResponse({
        status: 404,
        description: 'Chat not found',
    })
    @ApiResponse({
        status: 409,
        description: 'Conflict - already a member of this chat or not a group',
    })
    async joinGroup(
        @ReqUser() me: RequestUser,
        @Param('chatId') chatId: string,
    ) {
        return this.chatService.joinGroup(me, chatId);
    }

    @Delete(':chatId/participants/leave-group')
    @ApiParam({
        name: 'chatId',
        description: 'The ID of the chat',
        type: 'string',
    })
    @ApiOperation({ summary: 'Leave a group chat' })
    @ApiResponse({
        status: 200,
        description: 'Successfully left the group',
        type: LeaveGroupResponseDto,
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - not a member of this chat',
    })
    @ApiResponse({
        status: 404,
        description: 'Chat not found',
    })
    async leaveGroup(
        @ReqUser() me: RequestUser,
        @Param('chatId') chatId: string,
    ) {
        return this.chatService.leaveGroup(me, chatId);
    }
}
