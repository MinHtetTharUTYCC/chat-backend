import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Req,
    UseGuards,
    ValidationPipe,
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
import { ThrottlerGuard } from '@nestjs/throttler';

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatController {
    constructor(
        private readonly chatService: ChatService,
        private readonly messageService: MessageService,
    ) {}

    @Get()
    async getAllChats(@Req() req) {
        return this.chatService.getAllChats(req.user.sub);
    }

    @Get('/my-chats-ids')
    async getMyChatsIds(@Req() req) {
        return this.chatService.getMyChatsIds(req.user.sub);
    }

    @Post('/start')
    async startChat(
        @Req() req,
        @Body(ValidationPipe) startChatDto: StartChatDto,
    ) {
        return this.chatService.startChat(
            req.user.sub,
            startChatDto.otherUserId,
        );
    }

    @Get('/:chatId/messages')
    async getMessages(
        @Req() req,
        @Param('chatId') chatId: string,
        @Query(new ValidationPipe({ transform: true }))
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

    @Post('/:chatId/messages')
    async sendMessage(
        @Req() req,
        @Param('chatId') chatId: string,
        @Body(ValidationPipe) sendMessageDto: SendMessageDto,
    ) {
        return this.messageService.sendMessage(
            req.user.sub,
            chatId,
            sendMessageDto.content,
        );
    }

    @Get('/:chatId')
    async viewChat(@Req() req, @Param('chatId') chatId: string) {
        console.log('Viewing chat:', chatId, 'for user:', req.user.sub);
        return this.chatService.viewChat(req.user.sub, chatId);
    }

    @Delete('/:chatId/messages/:messageId')
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

    @Patch('/:chatId/messages/:messageId')
    async editMessage(
        @ReqUser() me: RequestUser,
        @Param('chatId') chatId: string,
        @Param('messageId') messageId: string,
        @Body(ValidationPipe) dto: EditMessageDto,
    ) {
        return this.messageService.editMessage(
            me,
            chatId,
            messageId,
            dto.content,
        );
    }

    // PINNED MESSAGES
    // get pinned messages
    @Get('/:chatId/pinned')
    async getPinnedMessages(
        @ReqUser() user: RequestUser,
        @Param('chatId') chatId: string,
        @Query(new ValidationPipe({ transform: true })) dto: PaginationDto,
    ) {
        return this.messageService.getPinnedMessages(
            user.sub,
            chatId,
            dto.cursor,
            dto.limit,
        );
    }

    //pin message
    @Post('/:chatId/messages/:messageId/pin')
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

    //unpin message
    @Delete('/:chatId/messages/:messageId/pin')
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

    @Patch('/:chatId/update-title')
    async updateChatTitle(
        @ReqUser() me: RequestUser,
        @Param('chatId') chatId: string,
        @Body(ValidationPipe) dto: UpdateChatTitleDto,
    ) {
        return this.chatService.updateChatTitle(me, chatId, dto.title);
    }

    @Post('/create-group')
    async createGroupChat(
        @ReqUser() me: RequestUser,
        @Body(ValidationPipe) dto: CreateGroupChatDto,
    ) {
        return this.chatService.createGroupChat(me, dto.title, dto.userIds);
    }

    @Post('/:chatId/participants')
    async addToGroupChat(
        @ReqUser() me: RequestUser,
        @Param('chatId') chatId: string,
        @Body(ValidationPipe) dto: AddToChatDto,
    ) {
        return this.chatService.addToGroupChat(me, chatId, dto.userIds);
    }

    @Post('/:chatId/participants/invite')
    async inviteToGroup(
        @ReqUser() me: RequestUser,
        @Param('chatId') chatId: string,
        @Body(ValidationPipe) dto: InviteToChatDto,
    ) {
        return this.chatService.inviteToGroupChat(me, chatId, dto.userIds);
    }

    @Get('/:chatId/invite-users')
    async searchUsersToInvite(
        @ReqUser() me: RequestUser,
        @Param('chatId') chatId: string,
        @Query('q') q: string,
    ) {
        return this.chatService.searchUsersToInvite(me, chatId, q);
    }

    @Post('/:chatId/participants/join-group')
    async joinGroup(
        @ReqUser() me: RequestUser,
        @Param('chatId') chatId: string,
    ) {
        return this.chatService.joinGroup(me, chatId);
    }

    @Delete('/:chatId/participants/leave-group')
    async leaveGroup(
        @ReqUser() me: RequestUser,
        @Param('chatId') chatId: string,
    ) {
        return this.chatService.leaveGroup(me, chatId);
    }
}
