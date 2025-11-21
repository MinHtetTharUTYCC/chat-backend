import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Message, NotificationType } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

import { ChatGateway } from 'src/chat/chat.gateway';
import { EditMessageDto } from 'src/chat/dto/edit-message.dto';

import { SendMessageDto } from 'src/chat/dto/sendMessage.dto';
import { DatabaseService } from 'src/database/database.service';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class MessageService {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly chatGateway: ChatGateway,
        private readonly notificationService: NotificationService,
    ) { }

    async sendMessage(userId: string, chatId: string, sendMessageDto: SendMessageDto) {
        await this.verifyMembership(userId, chatId);

        const message = await this.databaseService.$transaction(async (tx) => {
            const newMessage = await tx.message.create({
                data: {
                    ...sendMessageDto,
                    chatId,
                    senderId: userId,
                },
                include: {
                    sender: {
                        select: {
                            id: true,
                            username: true,
                        }
                    }
                }
            });

            await tx.chat.update({
                where: { id: chatId },
                data: { lastMessageAt: new Date() }
            });

            return newMessage;
        })

        // Broadcast via WS
        this.chatGateway.server.to(`chat_${chatId}`).emit('new_message', message)

        return message;
    }

    async getMessages(userId: string, chatId: string, cursor?: string, limit: number = 20) {
        await this.verifyMembership(userId, chatId);


        const messages = await this.databaseService.message.findMany({
            where: { chatId },
            take: limit,
            skip: cursor ? 1 : 0, //skip the cursor itself
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: { createdAt: 'desc' },
            include: {
                sender: {
                    select: { id: true, username: true }
                }
            }
        });

        let nextCursor: string | null = null;
        // if .lentth is fewer than limit, it reached the end
        if (messages.length === limit) {
            nextCursor = messages[messages.length - 1].id;
        }

        return {
            data: messages,
            meta: {
                nextCursor,
                hasMore: nextCursor !== null,
            }
        }
    }


    async deleteMessage(userId: string, chatId: string, messageId: string) {
        await this.verifyMembership(userId, chatId);

        const result = await this.databaseService.message.deleteMany({
            where: {
                id: messageId,
                senderId: userId,
                chatId,
            }
        });

        if (result.count === 0) throw new NotFoundException("Message not found or you are not the sender")

        return {
            success: true,
            message: "Successfully deleted the message"
        }
    }

    async editMessage(userId: string, chatId: string, messageId: string, dto: EditMessageDto) {
        const message = await this.databaseService.message.findFirst({
            where: {
                id: messageId,
                senderId: userId,
                chatId: chatId,
            }
        })

        if (!message) throw new NotFoundException("Message not found or you are not the sender")

        const updatedMessage = await this.databaseService.message.update({
            where: {
                id: messageId,
            },
            data: {
                content: dto.content,
            }
        })

        return updatedMessage;
    }

    async getPinnedMessage(userId: string, chatId: string, cursor?: string, limit: number = 20) {
        await this.verifyMembership(userId, chatId);

        const pinnedMessages = await this.databaseService.pinnedMessage.findMany({
            where: {
                chatId,
            },
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
            take: limit,
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                    }
                },
                message: {
                    select: {
                        id: true,
                        content: true,
                    }
                }
            }
        });

        let nextCursor: string | null = null
        if (pinnedMessages.length === limit) {
            nextCursor = pinnedMessages[pinnedMessages.length - 1].id;
        }

        return {
            data: pinnedMessages,
            meta: {
                nextCursor,
                hasMore: nextCursor !== null,
            }

        };

    }

    async pinMessage(userId: string, chatId: string, messageId: string) {
        await this.verifyMembership(userId, chatId);

        //all members can pin every message
        //verify message is in the chat
        const message = await this.databaseService.message.findFirst({
            where: {
                id: messageId,
                chatId,
            },
            select: {
                id: true,
                senderId: true,
            }
        });

        if (!message) throw new NotFoundException("Message not found in the chat");

        try {
            const pinMessage = await this.databaseService.pinnedMessage.create({
                data: {
                    pinnedByUserId: userId,
                    chatId,
                    messageId,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                        }
                    },
                    message: {
                        include: {
                            sender: {
                                select: {
                                    id: true,
                                    username: true,
                                }
                            },
                        }
                    },
                    chat: {
                        select: {
                            isGroup: true,
                        }
                    }
                }
            });

            //Noti DB
            //case 1: in group-chat, notify to messageOwner(only if messagePinner is not messageOwner:_skip if pinner==owner)
            //case 2: in one-to-one, ALWASYS notify to other-partcipant(neglect messageOwner)

            const socketPayload = {
                type: NotificationType.MESSAGE_PINNED,
                data: pinMessage,
                timestamp: new Date(),
            }

            // case 1: group-chat
            if (pinMessage.chat.isGroup) {
                // Broadcast "State Update" to EVERYONE (Silent update)
                // This ensures everyone sees the message get pinned in the UI immediately
                this.chatGateway.server.to(`chat_${chatId}`).emit('pin_updated', socketPayload);
                console.log("EMitted pin_updated")

                if (message.senderId !== userId) {
                    //For Noti popup
                    this.chatGateway.server.to(`chat_${chatId}`).emit('notification_new', socketPayload);
                    console.log("EMitted notification_new")

                    // Save noti DB
                    await this.notificationService.createNotification(
                        userId,
                        chatId,
                        {
                            receiverId: message.senderId,
                            type: NotificationType.MESSAGE_PINNED,
                            pinnedId: pinMessage.id,
                        }
                    );


                }
            } else {  //case 2: 1-to-1 chat
                const otherParticipant = await this.databaseService.participant.findFirst({
                    where: {
                        chatId,
                        userId: { not: userId }
                    },
                    select: { userId: true }
                })

                if (otherParticipant) {
                    // update pin UI immediately
                    this.chatGateway.server.to(`user_${otherParticipant.userId}`).emit('pin_updated', socketPayload);
                    //For Noti popup
                    this.chatGateway.server.to(`user_${otherParticipant.userId}`).emit('notification_new', socketPayload);

                    // Save noti DB
                    await this.notificationService.createNotification(
                        userId,
                        chatId,
                        {
                            receiverId: otherParticipant.userId,
                            type: NotificationType.MESSAGE_PINNED,
                            pinnedId: pinMessage.id,
                        }
                    );
                }

            }

            return pinMessage;

        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new ConflictException("Message is already pinned")
                }
            }
            throw error;
        }
    }

    //only 
    async unpinMessage(userId: string, chatId: string, messageId: string) {
        await this.verifyMembership(userId, chatId);

        //find pinnedMessage
        const pinnedRecord = await this.databaseService.pinnedMessage.findFirst({
            where: {
                chatId,
                messageId,
            },
            include: {
                message: {
                    select: { senderId: true }
                }
            }
        });

        if (!pinnedRecord) throw new NotFoundException("This message is not pinned");

        //permissions (allow only to pin-creator or message-owner)
        const isPinCreator = pinnedRecord.pinnedByUserId === userId;
        const isMessageOwner = pinnedRecord.message.senderId === userId;

        if (!isPinCreator && !isMessageOwner) throw new ForbiddenException("You can only upin your own pins or your own messages")

        await this.databaseService.pinnedMessage.delete({
            where: {
                id: pinnedRecord.id,
            }
        });

        return {
            success: true,
            message: 'Successfully unpineed message'
        }
    }

    // many functions use this
    async verifyMembership(userId: string, chatId: string) {
        const membership = await this.databaseService.participant.findUnique({
            where: {
                userId_chatId: {
                    userId,
                    chatId
                }
            },
            select: { id: true }
        });

        if (!membership) throw new ForbiddenException("You are not a participant of this chat");
    }
}
