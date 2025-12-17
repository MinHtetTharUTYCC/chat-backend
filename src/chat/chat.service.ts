import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { ChatGateway } from './chat.gateway';
import { NotificationType } from '@prisma/client';
import { NotificationService } from 'src/notification/notification.service';
import { MessageService } from 'src/message/message.service';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class ChatService {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly chatGateway: ChatGateway,
        private readonly notificationService: NotificationService,
        private readonly messageService: MessageService,
        private redisService: RedisService,
    ) {}

    async getAllChats(userId: string) {
        const cacheKey = `user:${userId}:chats`;

        //check redis
        const cached = await this.redisService.get(cacheKey);
        const cachedResult = cached ? JSON.parse(cached) : null;

        if (cachedResult) {
            console.log('Returning chats from cache..');
            return cachedResult;
        }

        const chats = await this.databaseService.chat.findMany({
            where: {
                participants: {
                    some: { userId },
                },
            },
            include: {
                messages: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 1,
                },
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                            },
                        },
                    },
                },
            },
            orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
        });

        //save to redis(TTL-time_to_live: 5min)
        await this.redisService.set(cacheKey, JSON.stringify(chats), 300);

        return chats;
    }

    async viewChat(userId: string, chatId: string) {
        const isParticipant = await this.databaseService.participant.findUnique(
            {
                where: {
                    userId_chatId: {
                        userId,
                        chatId,
                    },
                },
                select: { id: true },
            },
        );

        if (isParticipant) {
            return this.getChat(chatId);
        }

        const chat = await this.databaseService.chat.findUnique({
            where: { id: chatId },
            include: {
                _count: {
                    select: {
                        participants: true,
                    },
                },
            },
        });

        if (!chat) {
            throw new NotFoundException('Chat not found');
        }
        if (!chat.isGroup) {
            throw new ForbiddenException(
                'You cannot view private chats of others',
            );
        }

        return {
            chat,
            isNewGroupChat: true,
        };
    }

    async getChat(chatId: string) {
        const cachedKey = `chat:${chatId}`;
        const cached = await this.redisService.get(cachedKey);
        const cachedResult = cached ? JSON.parse(cached) : null;

        if (cachedResult) {
            console.log('Returning latest chat from cache...');
            return cachedResult;
        }

        const chat = await this.databaseService.chat.findUnique({
            where: {
                id: chatId, //'am i participant?' is already checked at viewChat()
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                            },
                        },
                    },
                },
                messages: {
                    include: {
                        sender: {
                            select: {
                                id: true,
                                username: true,
                            },
                        },
                    },
                    take: 20,
                    orderBy: {
                        createdAt: 'desc',
                    },
                },
            },
        });

        if (!chat) throw new NotFoundException('Chat not found');

        await this.redisService.set(cachedKey, JSON.stringify(chat), 300); //5 minutes

        return chat;
    }

    async startChat(userId: string, otherUserId: string) {
        if (userId === otherUserId) {
            throw new BadRequestException('You cannot chat with yourself');
        }
        // check if other user is valid
        const otherUser = await this.databaseService.user.findUnique({
            where: { id: otherUserId },
            select: { id: true },
        });
        if (!otherUser) throw new NotFoundException('User not found');

        //check if chat exists already
        const existingChat = await this.databaseService.chat.findFirst({
            where: {
                participants: {
                    some: { userId },
                },
                AND: [
                    {
                        participants: {
                            some: {
                                userId: otherUserId,
                            },
                        },
                    },
                    //sure it's a DM, not GroupChat
                    {
                        isGroup: false,
                    },
                ],
            },
            select: {
                id: true,
            },
        });

        if (existingChat)
            return {
                oldChatExists: true,
                chat: existingChat,
            };

        //create new chat
        const newChat = await this.databaseService.chat.create({
            data: {
                participants: {
                    create: [{ userId }, { userId: otherUserId }],
                },
            },
            select: {
                id: true,
            },
        });

        await this.notificationService.createNotification(userId, newChat.id, {
            receiverId: otherUserId,
            type: NotificationType.NEW_CHAT,
        });

        const socketPayload = {
            type: NotificationType.NEW_CHAT,
            data: newChat,
        };
        this.chatGateway.server
            .to(`user_${otherUserId}`)
            .emit('new_chat', socketPayload);

        // Invalidate cache for both users
        await this.redisService.del(`user:${userId}:chats`);
        await this.redisService.del(`user:${otherUserId}:chats`);

        return {
            oldChatExists: false,
            chat: newChat,
        };
    }

    async getMyFriendsIds(userId: string) {
        const chats = await this.databaseService.chat.findMany({
            where: {
                participants: {
                    some: { userId },
                },
            },
            select: {
                participants: {
                    select: { userId: true },
                },
            },
        });

        // extract all participants ID except me
        const friendIds = new Set<string>();

        for (const chat of chats) {
            for (const participant of chat.participants) {
                if (participant.userId !== userId) {
                    friendIds.add(participant.userId);
                }
            }
        }

        return Array.from(friendIds);
    }

    async getMyChatsIds(userId: string) {
        const chats = await this.databaseService.chat.findMany({
            where: {
                participants: {
                    some: {
                        userId,
                    },
                },
            },
            select: {
                id: true,
            },
        });

        return chats.map((chat) => chat.id);
    }

    async updateChatTitle(userId: string, chatId: string, newTitle: string) {
        const result = await this.databaseService.$transaction(async (tx) => {
            const chat = await tx.chat.findUnique({
                where: { id: chatId },
                select: {
                    id: true,
                    isGroup: true,
                    participants: {
                        select: {
                            userId: true,
                        },
                    },
                },
            });

            const participant = await tx.participant.findUnique({
                where: {
                    userId_chatId: {
                        userId,
                        chatId,
                    },
                },
                select: {
                    user: {
                        select: {
                            username: true,
                        },
                    },
                },
            });

            return { chat, participant };
        });

        if (!result.chat) throw new NotFoundException('Chat not found');
        if (!result.chat.isGroup)
            throw new ForbiddenException(
                'Direct messages cannot have custom titles',
            );

        if (!result.participant)
            throw new ForbiddenException('You are not the member of this chat');

        const dataToUpdate = {
            title: newTitle === '' ? null : newTitle,
        };

        await this.databaseService.chat.update({
            where: { id: chatId },
            data: dataToUpdate,
        });

        // INVALIDATE Cache
        //del chat details
        await this.redisService.del(`chat:${chatId}`);
        //del chats
        const promises = result.chat.participants.map((parti) =>
            this.redisService.del(`user:${parti.userId}:chats`),
        );
        await Promise.all(promises);

        // Broadcast via WS
        this.chatGateway.server.to(`chat_${chatId}`).emit('title_update', {
            chatId,
            newTitle,
            updatedById: userId,
            updatedByUsername: result.participant.user.username,
        });

        return {
            success: true,
            chatId,
            newTitle,
        };
    }

    async createGroupChat(userId: string, title: string, userIds: string[]) {
        // Set: for removing dupblicates
        let uniqueUserIds = new Set<string>([...userIds, userId]);
        const usersToParticipate = Array.from(uniqueUserIds).map((id) => ({
            userId: id,
        }));

        if (usersToParticipate.length < 2) {
            throw new BadRequestException(
                'A group must have at least 2 participants',
            );
        }

        const groupChat = await this.databaseService.chat.create({
            data: {
                isGroup: true,
                title: title || 'New Group',
                participants: {
                    create: usersToParticipate,
                },
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                            },
                        },
                    },
                },
                messages: {
                    include: {
                        sender: {
                            select: {
                                id: true,
                                username: true,
                            },
                        },
                    },
                },
            },
        });

        uniqueUserIds.delete(userId); //deduct me
        const usersToNotify = Array.from(uniqueUserIds).map(
            (id) => `user_${id}`,
        );

        await Promise.all(
            Array.from(uniqueUserIds).map(async (id) => {
                await this.notificationService.createNotification(
                    userId,
                    groupChat.id,
                    {
                        receiverId: id,
                        type: NotificationType.GROUP_ADDED,
                    },
                );
            }),
        );

        const socketPayload = {
            type: NotificationType.GROUP_ADDED,
            data: groupChat,
        };

        this.chatGateway.server
            .to(usersToNotify)
            .emit('group_added', socketPayload);

        // Invalidate cache
        await Promise.all(
            Array.from([...uniqueUserIds, userId]).map(async (id) => {
                await this.redisService.del(`user:${id}:chats`);
            }),
        );

        return groupChat;
    }

    async addToGroupChat(userId: string, chatId: string, userIds: string[]) {
        const chat = await this.databaseService.chat.findUnique({
            where: { id: chatId },
            select: {
                isGroup: true,
                participants: {
                    where: {
                        userId,
                    },
                    select: {
                        id: true,
                    },
                },
            },
        });
        if (!chat) throw new NotFoundException('Chat not found');
        if (chat.participants.length === 0)
            throw new ForbiddenException('You are not a member of this chat');
        if (!chat.isGroup)
            throw new ForbiddenException(
                'You cannot add members to 1-on-1 chat. Create a group instead.',
            );

        const uniqueUserIds = new Set(userIds.filter((id) => id !== userId)); //filter me(if exists) and remove duplicates
        const newUsersToParticipate = Array.from(uniqueUserIds).map((id) => ({
            userId: id,
        }));
        const newUsersToNotify = Array.from(uniqueUserIds).map(
            (id) => `user_${id}`,
        );

        try {
            const updatedChat = await this.databaseService.chat.update({
                where: {
                    id: chatId,
                },
                data: {
                    participants: {
                        create: newUsersToParticipate,
                    },
                },
                include: {
                    participants: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    username: true,
                                },
                            },
                        },
                    },
                },
            });

            await Promise.all(
                Array.from(uniqueUserIds).map(async (id) => {
                    await this.notificationService.createNotification(
                        userId,
                        chatId,
                        {
                            receiverId: id,
                            type: NotificationType.GROUP_ADDED,
                        },
                    );
                }),
            );

            const socketPayload = {
                type: NotificationType.GROUP_ADDED,
                data: updatedChat,
            };

            this.chatGateway.server
                .to(newUsersToNotify)
                .emit('group_added', socketPayload);

            // Invalidate cache
            await Promise.all(
                Array.from(uniqueUserIds).map(async (id) => {
                    await this.redisService.del(`user:${id}:chats`);
                }),
            );

            return updatedChat;
        } catch (error) {
            if (error.code === 'P2025') {
                throw new BadRequestException('One or more users do not exist');
            }
            throw error;
        }
    }

    async joinGroup(userId: string, chatId: string) {
        const existingParticipant =
            await this.databaseService.participant.findUnique({
                where: {
                    userId_chatId: {
                        userId,
                        chatId,
                    },
                },
                select: {
                    id: true,
                },
            });
        if (existingParticipant)
            throw new ConflictException('Already joined the chat');

        await this.databaseService.participant.create({
            data: {
                userId,
                chatId,
            },
            select: {
                id: true,
                user: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
            },
        });

        const socketPaylod = {
            chatId,
            timestamp: new Date(),
        };

        // update UI immediately
        this.chatGateway.server
            .to(`user_${userId}`)
            .emit('group_joined', socketPaylod);

        // VALIDATE chats cache
        await this.redisService.del(`user:${userId}:chats`);

        return {
            success: true,
            message: 'Successfully joined the group chat.',
        };
    }

    async leaveGroup(userId: string, chatId: string) {
        await this.messageService.verifyMembership(userId, chatId);

        await this.databaseService.participant.delete({
            where: {
                userId_chatId: {
                    userId,
                    chatId,
                },
            },
        });

        const socketPaylod = {
            chatId,
            timestamp: new Date(),
        };

        // update UI immediately
        this.chatGateway.server
            .to(`user_${userId}`)
            .emit('group_leaved', socketPaylod);

        // invalidate chats cache
        await this.redisService.del(`user:${userId}:chats`);

        return {
            success: true,
            message: 'Successfully leaved the chat',
        };
    }
}
