import { Body, Controller, Get, Param, Post, Req, UseGuards, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { StartChatDto } from './dto/startChat.dto';
import { SendMessageDto } from './dto/sendMessage.dto';
import { MessageService } from 'src/message/message.service';

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

    @Get("/:chatId.messages")
    @UseGuards(JwtAuthGuard)
    async getMessages(@Param('chatId') chatId: string, @Req() req) {
        return this.messageService.getMessages(chatId, req.user.sub)
    }

    @Post('/:chatId/messages')
    @UseGuards(JwtAuthGuard)
    async sendMessage(@Req() req, @Body(ValidationPipe) sendMessageDto: SendMessageDto) {
        return this.messageService.sendMessage(req.user.sub, sendMessageDto)
    }

}
