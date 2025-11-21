import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UseGuards, ValidationPipe } from '@nestjs/common';
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

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatController {
    constructor(
        private readonly chatService: ChatService,
        private readonly messageService: MessageService,
    ) { }

    @Get()
    async getChats(@Req() req) {
        return this.chatService.getChats(req.user.sub)
    }

    @Post('/start')
    async startChat(@Req() req, @Body(ValidationPipe) startChatDto: StartChatDto) {
        return this.chatService.startChat(req.user.sub, startChatDto.otherUserId);
    }

    @Get("/:chatId/messages")
    async getMessages(@Param('chatId') chatId: string,
        @Req() req,
        @Query(new ValidationPipe({ transform: true })) query: PaginationDto) {
        return this.messageService.getMessages(req.user.sub, chatId, query.cursor, query.limit)
    }

    @Post('/:chatId/messages')
    async sendMessage(@Req() req, @Param('chatId') chatId: string, @Body(ValidationPipe) sendMessageDto: SendMessageDto) {
        return this.messageService.sendMessage(req.user.sub, chatId, sendMessageDto)
    }

    @Delete("/:chatId/messages/:messageId")
    async deleteMessage(@Req() req, @Param('chatId') chatId: string, @Param('messageId') messageId: string) {
        return this.messageService.deleteMessage(req.user.sub, chatId, messageId)
    }

    @Patch("/:chatId/messages/:messageId")
    async editMessage(@Req() req, @Param('chatId') chatId: string, @Param('messageId') messageId: string, @Body(ValidationPipe) dto: EditMessageDto) {
        return this.messageService.editMessage(req.user.sub, chatId, messageId, dto)
    }

    // PINNED MESSAGES
    // get pinned messages
    @Get('/:chatId/pinned')
    async getPinnedMessages(@Req() req, @Param('chatId') chatId: string, @Param('messageId') messageId: string) {
        return this.messageService.getPinnedMessage(req.user.sub, chatId, messageId);
    }

    //pin message
    @Post('/:chatId/messages/:messageId/pin')
    async pinMessage(@Req() req, @Param('chatId') chatId: string, @Param('messageId') messageId: string) {
        return this.messageService.pinMessage(req.user.sub, chatId, messageId);
    }

    //unpin message
    @Delete('/:chatId/messages/:messageId/pin')
    async unpinMessage(@Req() req, @Param('chatId') chatId: string, @Param('messageId') messageId: string) {
        return this.messageService.unpinMessage(req.user.sub, chatId, messageId);
    }

    @Put('/:chatId/update-title')
    async updateChatTitle(@Param('chatId') chatId: string, @Req() req, @Body(ValidationPipe) dto: UpdateChatTitleDto) {
        return this.chatService.updateChatTitle(req.user.sub, chatId, dto)
    }

    @Post('/create-group')
    async createGroupChat(@Req() req, @Body(ValidationPipe) dto: CreateGroupChatDto) {
        return this.chatService.createGroupChat(req.user.sub, dto);
    }


    @Get('/:chatId')
    async getChatInfo(@Param('chatId') chatId: string,) {
        return this.chatService.getChatInfo(chatId);
    }


    @Post('/:chatId/participants')
    async addToChat(@Param('chatId') chatId: string, @Req() req, @Body(ValidationPipe) dto: AddToChatDto) {
        return this.chatService.addToGroupChat(req.user.sub, chatId, dto)
    }

    // NEED ROLE to do this
    // @Delete('/:chatId/participants')
    // @UseGuards(JwtAuthGuard)
    // async removeFromGroup(@Param('chatId') chatId: string, @Req() req, @Body(ValidationPipe) dto: RemoveFromGroupChatDto) {
    //     return this.chatService.removeFromGroup(req.user.sub, chatId, dto)
    // }

    @Post('/:chatId/participants/join-group')
    async joinGroup(@Param('chatId') chatId: string, @Req() req) {
        return this.chatService.joinGroup(req.user.sub, chatId)
    }

    @Delete('/:chatId/participants/leave-group')
    async leaveGroup(@Param('chatId') chatId: string, @Req() req) {
        return this.chatService.leaveGroup(req.user.sub, chatId)
    }
}
