import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Req, UseGuards, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { StartChatDto } from './dto/startChat.dto';
import { SendMessageDto } from './dto/sendMessage.dto';
import { MessageService } from 'src/message/message.service';
import { UpdateChatTitleDto } from './dto/update-chat-title.dto';
import { AddToChatDto } from './dto/add-to-chat.dto';
import { CreateGroupChatDto } from './dto/create-group-chat.dto';
import { RemoveFromGroupChatDto } from './dto/remove-from-group-chat.dto';
import { EditMessageDto } from './dto/edit-message.dto';

@Controller('chats')
export class ChatController {
    constructor(
        private readonly chatService: ChatService,
        private readonly messageService: MessageService,
    ) { }

    @Get()
    @UseGuards(JwtAuthGuard)
    async getChats(@Req() req) {
        return this.chatService.getChats(req.user.sub)
    }

    @Post('/start')
    @UseGuards(JwtAuthGuard)
    async startChat(@Req() req, @Body(ValidationPipe) startChatDto: StartChatDto) {
        return this.chatService.startChat(req.user.sub, startChatDto.otherUserId);
    }

    @Get("/:chatId/messages")
    @UseGuards(JwtAuthGuard)
    async getMessages(@Param('chatId') chatId: string, @Req() req) {
        return this.messageService.getMessages(chatId, req.user.sub)
    }

    //TODO: to remove This route is not ideal,(only for testing), (it shuld be done via Socket)
    @Post('/:chatId/messages')
    @UseGuards(JwtAuthGuard)
    async sendMessage(@Req() req, @Body(ValidationPipe) sendMessageDto: SendMessageDto) {
        return this.messageService.sendMessage(req.user.sub, sendMessageDto)
    }

    @Delete("/:chatId/messages/:messageId")
    @UseGuards(JwtAuthGuard)
    async deleteMessage(@Req() req, @Param('chatId') chatId: string, @Param('messageId') messageId: string) {
        return this.messageService.deleteMessage(req.user.sub, chatId, messageId)
    }

    @Patch("/:chatId/messages/:messageId")
    @UseGuards(JwtAuthGuard)
    async editMessage(@Req() req, @Param('chatId') chatId: string, @Param('messageId') messageId: string, @Body(ValidationPipe) dto: EditMessageDto) {
        return this.messageService.editMessage(req.user.sub, chatId, messageId, dto)
    }


    @Put('/:chatId/update-title')
    @UseGuards(JwtAuthGuard)
    async updateChatTitle(@Param('chatId') chatId: string, @Req() req, @Body(ValidationPipe) dto: UpdateChatTitleDto) {
        return this.chatService.updateChatTitle(req.user.sub, chatId, dto)
    }

    @Post('/create-group')
    @UseGuards(JwtAuthGuard)
    async createGroupChat(@Req() req, @Body(ValidationPipe) dto: CreateGroupChatDto) {
        return this.chatService.createGroupChat(req.user.sub, dto);
    }


    @Get('/:chatId')
    @UseGuards(JwtAuthGuard)
    async getChatInfo(@Param('chatId') chatId: string,) {
        return this.chatService.getChatInfo(chatId);
    }


    @Post('/:chatId/participants')
    @UseGuards(JwtAuthGuard)
    async addToChat(@Param('chatId') chatId: string, @Req() req, @Body(ValidationPipe) dto: AddToChatDto) {
        return this.chatService.addToChat(req.user.sub, chatId, dto)
    }

    // NEED ROLE to do this
    // @Delete('/:chatId/participants')
    // @UseGuards(JwtAuthGuard)
    // async removeFromGroup(@Param('chatId') chatId: string, @Req() req, @Body(ValidationPipe) dto: RemoveFromGroupChatDto) {
    //     return this.chatService.removeFromGroup(req.user.sub, chatId, dto)
    // }

    @Post('/:chatId/participants/join-group')
    @UseGuards(JwtAuthGuard)
    async joinGroup(@Param('chatId') chatId: string, @Req() req) {
        return this.chatService.joinGroup(req.user.sub, chatId)
    }

    @Delete('/:chatId/participants/leave-group')
    @UseGuards(JwtAuthGuard)
    async leaveGroup(@Param('chatId') chatId: string, @Req() req) {
        return this.chatService.leaveGroup(req.user.sub, chatId)
    }


}
