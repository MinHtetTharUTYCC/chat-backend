import { Body, Controller, Get, Param, Post, Put, Req, UseGuards, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { StartChatDto } from './dto/startChat.dto';
import { SendMessageDto } from './dto/sendMessage.dto';
import { MessageService } from 'src/message/message.service';
import { UpdateChatTitleDto } from './dto/update-chat-title.dto';
import { AddToChatDto } from './dto/add-to-chat.dto';
import { CreateGroupChatDto } from './dto/create-group-chat.dto';

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

}
