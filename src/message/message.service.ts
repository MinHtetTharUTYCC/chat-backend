import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
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
        @Inject(CACHE_MANAGER)
        private cacheManager: Cache,
    ) { }

    async sendMessage(userId: string, chatId: string, content: string) {
        await this.verifyMembership(userId, chatId);

        const result = await this.databaseService.$transaction(async (tx) => {
            const newMessage = await tx.message.create({
                data: {
                    content,
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

            const updatedChat = await tx.chat.update({
                where: { id: chatId },
                data: { lastMessageAt: new Date() },
                include: {
                    participants: {
                        select: {
                            userId: true,
                        }
                    }
                }
            });

            return { newMessage, updatedChat };
        })

        // Broadcast via WS
        this.chatGateway.server.to(`chat_${chatId}`).emit('new_message', result.newMessage);

        // INVALIDATE Cache
        //del chats
        const promises = result.updatedChat.participants.map(parti => this.cacheManager.del(`user:${parti.userId}:chats`));
        await Promise.all(promises);

        await this.cacheManager.del(`chat:${chatId}:latest`)

        return result.newMessage;
    }

    async getMessages(userId: string, chatId: string, cursor?: string, limit: number = 20) {
        await this.verifyMembership(userId, chatId);

        const latestMessageKey = `chat:${chatId}:latest`;

        if (!cursor) {
            const cachedResult = await this.cacheManager.get(latestMessageKey);
            if (cachedResult) {
                console.log("Returning messages + meta from cache...")
                return cachedResult;
            }
        }

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
        // if .length is fewer than limit, it reached the end
        if (messages.length === limit && messages.length > 0) {
            nextCursor = messages[messages.length - 1].id;
        }

        const response = {
            data: messages,
            meta: {
                nextCursor,
                hasMore: nextCursor !== null,
            }
        }

        if (!cursor) {
            await this.cacheManager.set(latestMessageKey, response, 300 * 1000);//5 minute
        }

        return response;
    }

    async deleteMessage(userId: string, chatId: string, messageId: string) {
        // await this.verifyMembership(userId, chatId); //no-need(reduce db calls) anymore cuz, we need others participants(see DB call below)

        const participants = await this.databaseService.participant.findMany({
            where: { chatId },
            select: {
                userId: true
            }
        });


        const usersToValidate = participants.map(parti => parti.userId);
        if (!usersToValidate.includes(userId)) {
            throw new ForbiddenException("You are not a member of this chat")
        }

        const result = await this.databaseService.message.deleteMany({
            where: {
                id: messageId,
                senderId: userId,
                chatId,
            }
        });

        if (result.count === 0) throw new NotFoundException("Message not found or you are not the sender");

        // update UI immediately
        this.chatGateway.server.to(`chat_${chatId}`).emit('message_deleted', { messageId });

        // INVALIDATE Cache
        //1: to chat messages
        await this.cacheManager.del(`chat:${chatId}:latest`);
        //2: to all participants's chats list
        // seems aggressive: but unsending is rare: so minimun DB call
        // (instead of checking if message is last message and delete:_can introdude bugs)
        const promises = usersToValidate.map((usrId) => this.cacheManager.del(`user:${usrId}:chats`));
        await Promise.all(promises);

        return {
            success: true,
            message: "Successfully deleted the message"
        }
    }

    async editMessage(userId: string, chatId: string, messageId: string, content: string) {
        const message = await this.databaseService.message.findFirst({
            where: {
                id: messageId,
                senderId: userId,
                chatId: chatId,
            },
            include: {
                chat: {
                    include: {
                        participants: {
                            select: { userId: true }
                        }
                    }
                }
            }
        })
        if (!message) throw new NotFoundException("Message not found or you are not the sender");

        const usersToValidate = message.chat.participants.map(parti => parti.userId);
        if (!usersToValidate.includes(userId)) {
            throw new ForbiddenException("You are not a member of this chat")
        }

        const updatedMessage = await this.databaseService.message.update({
            where: {
                id: messageId,
            },
            data: {
                content: content,
            }
        });

        // update UI immediately
        this.chatGateway.server.to(`chat_${chatId}`).emit('message_updated', { messageId });

        // VALIDATE Cache 
        //1: to chat messages
        await this.cacheManager.del(`chat:${chatId}:latest`);
        //2: to all participants's chats list
        // seems aggressive: but unsending is rare: so minimun DB call
        // (instead of checking if message is last message and delete:_can introdude bugs)
        const promises = usersToValidate.map((usrId) => this.cacheManager.del(`user:${usrId}:chats`));
        await Promise.all(promises);

        return updatedMessage;
    }

    async getPinnedMessages(userId: string, chatId: string, cursor?: string, limit: number = 20) {
        await this.verifyMembership(userId, chatId);

        const cachedKey = `chat:${chatId}:pinned_messages:latest`;

        if (!cursor) {
            const cachedResult = await this.cacheManager.get(cachedKey);
            if (cachedResult) {
                console.log("Returning pinned messages from cache...");
                return cachedResult;
            }
        }

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

        if (!cursor) {
            await this.cacheManager.set(cachedKey, pinnedMessages, 1800 * 1000);//30 minutes
        }

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
                this.chatGateway.server.to(`chat_${chatId}`).emit('pin_added', socketPayload);
                console.log("EMitted pin_added")

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
                    this.chatGateway.server.to(`chat_${chatId}`).emit('pin_added', socketPayload);
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

            // INVALIDATE Cache
            const keysToDelete = [
                `chat:${chatId}:latest`,
                `chat:${chatId}:pinned_messages:latest`, // i have pinned message (api end point)
            ]
            await this.cacheManager.del(keysToDelete[0]);
            await this.cacheManager.del(keysToDelete[1]);

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

        this.chatGateway.server.to(`chat_${chatId}`).emit('pin_removed', { messageId });

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
