import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SendMessageDto } from 'src/chat/dto/sendMessage.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class MessageService {
    constructor(private readonly databaseService: DatabaseService) { }

    async sendMessage(senderId: string, sendMessageDto: SendMessageDto) {
        //check if check exists and user belong to it
        const chat = await this.databaseService.chat.findUnique({
            where: { id: sendMessageDto.chatId },
            include: { participants: true }
        });

        if (!chat) throw new NotFoundException("Chat not found")

        const isParticipant = chat.participants.some(p => p.userId === senderId)
        if (!isParticipant) throw new ForbiddenException("You are not a participant of this chat")


        // create message
        const message = await this.databaseService.message.create({
            data: {
                ...sendMessageDto,
                senderId,
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    }
                }
            }
        })

        return message;
    }

    async getMessages(chatId: string, userId: string) {
        const chat = await this.databaseService.chat.findUnique({
            where: { id: chatId },
            include: { participants: true }
        })

        if (!chat) throw new NotFoundException("Chat not found")

        const isParticipant = chat.participants.some(p => p.userId === userId)
        if (!isParticipant) throw new ForbiddenException("You are not a participant of this chat")

        return this.databaseService.message.findMany({
            where: { chatId },
            orderBy: { createdAt: 'desc' }, //TODO: pagingation later
            include: {
                sender: {
                    select: { id: true, username: true, email: true }
                }
            }
        })

    }
}
