import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { ChatGateway } from './chat.gateway';
import { NotificationType } from '@prisma/client';
import { NotificationService } from 'src/notification/notification.service';
import { CACHE_MANAGER } from "@nestjs/cache-manager"
import type { Cache } from "cache-manager"
import { MessageService } from 'src/message/message.service';


@Injectable()
export class ChatService {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly chatGatway: ChatGateway,
        private readonly notificationService: NotificationService,
        private readonly messageService: MessageService,
        @Inject(CACHE_MANAGER)
        private cacheManager: Cache,
    ) { }

    // moved to sepearte module
    // async onModuleInit() {
    //     const cache = this.cacheManager as any;

    //     // Try to find the Redis Client in the possible locations:
    //     // 1. cache.store.client (Standard v4)
    //     // 2. cache.stores[0].client (Multi-cache / v5 specific wrappers)
    //     // 3. cache.client (If the store was merged into the object)
    //     const redisClient = cache.store?.client ?? cache.stores?.[0]?.client ?? cache.client;

    //     if (redisClient) {
    //         console.log('✅ REDIS CONNECTION SUCCESSFUL');

    //         // Test by listing keys
    //         const keys = await redisClient.keys('*');
    //         console.log('🔑 keys in redis:', keys);
    //     } else {
    //         console.error('❌ REDIS CLIENT NOT FOUND. Printing Cache Object for debugging:');
    //         console.log(Object.keys(cache)); // This will show us what properties ACTUALLY exist
    //     }
    // }

    async getAllChats(userId: string) {
        const cacheKey = `user:${userId}:chats`;

        //check redis
        const cachedData = await this.cacheManager.get(cacheKey);
        if (cachedData) {
            console.log("Returning chats from cache..")
            return cachedData;
        }

        const chats = await this.databaseService.chat.findMany({
            where: {
                participants: {
                    some: { userId }
                }
            },
            include: {
                messages: {
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 1,
                },
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                            }
                        }
                    }
                }
            },
            orderBy: [
                { lastMessageAt: 'desc' },
                { updatedAt: 'desc' },
            ]
        });

        //save to redis(TTL-time_to_live: 5min)
        await this.cacheManager.set(cacheKey, chats, 300 * 1000);

        return chats;
    }

    async viewChat(userId: string, chatId: string) {
        const isParticipant = await this.databaseService.participant.findUnique({
            where: {
                userId_chatId: {
                    userId,
                    chatId
                }
            },
            select: { id: true }
        });

        if (isParticipant) {
            return this.getChat(chatId);
        }

        const chat = await this.databaseService.chat.findUnique({
            where: { id: chatId },
            include: {
                _count: {
                    select: {
                        participants: true,
                    }
                }
            }
        });

        if (!chat) {
            throw new NotFoundException("Chat not found");
        }
        if (!chat.isGroup) {
            throw new ForbiddenException("You cannot view private chats of others")
        }

        return {
            chat,
            isNewGroupChat: true,
        };
    }

    async getChat(chatId: string) {
        const cachedKey = `chat:${chatId}`;
        const cachedResult = await this.cacheManager.get(cachedKey);
        if (cachedResult) {
            console.log("Returing latest chat from cache...");
            return cachedResult;
        }

        const chat = await this.databaseService.chat.findUnique({
            where: {
                id: chatId,//'am i participant?' is already checked at viewChat()
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                            }
                        }
                    }
                },
                messages: {
                    include: {
                        sender: {
                            select: {
                                id: true,
                                username: true,
                            }
                        }
                    },
                    take: 20,
                    orderBy: {
                        createdAt: 'desc',
                    }
                },
            },
        });

        if (!chat) throw new NotFoundException("Chat not found");

        await this.cacheManager.set(cachedKey, chat, 300 * 1000); //5 minutes

        return chat;
    }

    async startChat(userId: string, otherUserId: string) {
        if (userId === otherUserId) {
            throw new BadRequestException("You cannot chat with yourself")
        }
        // check if other user is valid
        const otherUser = await this.databaseService.user.findUnique({
            where: { id: otherUserId },
            select: { id: true }
        })
        if (!otherUser) throw new NotFoundException("User not found")

        //check if chat exists already
        const existingChat = await this.databaseService.chat.findFirst({
            where: {
                participants: {
                    some: { userId }
                },
                AND: [
                    {
                        participants: {
                            some: {
                                userId: otherUserId,
                            }
                        }
                    },
                    //sure it's a DM, not GroupChat
                    {
                        isGroup: false,
                    }
                ]
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                email: true,
                            }
                        }
                    }
                },
                messages: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 1,
                }
            }
        })

        if (existingChat) return existingChat;

        //create new chat
        const newChat = await this.databaseService.chat.create({
            data: {
                participants: {
                    create: [
                        { userId },
                        { userId: otherUserId }
                    ]
                }
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                email: true,
                            }
                        }
                    }
                },
                messages: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 1,
                }
            }
        });

        await this.notificationService.createNotification(userId, newChat.id, {
            receiverId: otherUserId,
            type: NotificationType.NEW_CHAT
        })

        const socketPayload = {
            type: NotificationType.NEW_CHAT,
            data: newChat,
        }
        this.chatGatway.server.to(`user_${otherUserId}`).emit("new_chat", socketPayload);

        // Invalidate cache for both users
        await this.cacheManager.del(`user:${userId}:chats`);
        await this.cacheManager.del(`user:${otherUserId}:chats`);

        return newChat;
    }

    async getMyFriendsIds(userId: string) {
        const chats = await this.databaseService.chat.findMany({
            where: {
                participants: {
                    some: { userId }
                }
            },
            select: {
                participants: {
                    select: { userId: true }
                }
            }
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
                    }
                }
            },
            select: {
                id: true,
            }
        });

        return chats.map(chat => chat.id);
    }

    async updateChatTitle(userId: string, chatId: string, newTitle: string) {
        const chat = await this.databaseService.chat.findUnique({
            where: { id: chatId, participants: { some: { userId } } },
            select: {
                id: true,
                isGroup: true,
            }
        })

        if (!chat) throw new NotFoundException("Chat not found")

        if (!chat.isGroup) throw new ForbiddenException("Direct messages cannot have custom titles")

        const dataToUpdate = {
            title: newTitle === '' ? null : newTitle,
        }

        await this.databaseService.chat.update({
            where: { id: chatId },
            data: dataToUpdate,
        });

        return {
            success: true,
            chatId,
            newTitle,
        }
    }

    async createGroupChat(userId: string, title: string, userIds: string[]) {
        // Set: for removing dupblicates
        let uniqueUserIds = new Set<string>([
            ...userIds,
            userId,
        ])
        const usersToParticipate = Array.from(uniqueUserIds).map(id => ({ userId: id }))

        if (usersToParticipate.length < 2) {
            throw new BadRequestException("A group must have at least 2 participants")
        }

        const groupChat = await this.databaseService.chat.create({
            data: {
                isGroup: true,
                title: title || 'New Group',
                participants: {
                    create: usersToParticipate,
                }
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                            }
                        }
                    }
                }
            }
        });

        uniqueUserIds.delete(userId);//deduct me
        const usersToNotify = Array.from(uniqueUserIds).map(id => `user_${id}`);


        await Promise.all(
            Array.from(uniqueUserIds).map(async (id) => {
                await this.notificationService.createNotification(
                    userId,
                    groupChat.id,
                    {
                        receiverId: id,
                        type: NotificationType.GROUP_ADDED
                    })
            })
        );

        const socketPayload = {
            type: NotificationType.GROUP_ADDED,
            data: groupChat,
            timestam: new Date()
        }
        this.chatGatway.server.to(usersToNotify).emit("group_added", socketPayload);

        // Invalidate cache
        await Promise.all(
            Array.from([...uniqueUserIds, userId]).map(async (id) => {
                await this.cacheManager.del(`user:${id}:chats`);
            })
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
                        id: true
                    }
                }
            }
        })
        if (!chat) throw new NotFoundException("Chat not found")
        if (chat.participants.length === 0) throw new ForbiddenException("You are not a member of this chat")
        if (!chat.isGroup) throw new ForbiddenException("You cannot add members to 1-on-1 chat. Create a group instead.")

        const uniqueUserIds = new Set(userIds.filter(id => id !== userId)); //filter me(if exists) and remove duplicates
        const newUsersToParticipate = Array.from(uniqueUserIds).map((id) => ({ userId: id }));
        const newUsersToNotify = Array.from(uniqueUserIds).map(id => `user_${id}`);

        try {
            const updatedChat = await this.databaseService.chat.update({
                where: {
                    id: chatId,
                },
                data: {
                    participants: {
                        create: newUsersToParticipate,
                    }
                },
                include: {
                    participants: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    username: true,
                                }
                            }
                        }
                    }
                }
            });

            await Promise.all(
                Array.from(uniqueUserIds).map(async (id) => {
                    await this.notificationService.createNotification(userId, chatId, {
                        receiverId: id,
                        type: NotificationType.GROUP_ADDED,
                    })
                })
            )

            const sockerPayload = {
                type: NotificationType.GROUP_ADDED,
                data: updatedChat,
                timestam: new Date(),
            }

            this.chatGatway.server.to(newUsersToNotify).emit("group_added", sockerPayload);

            // Invalidate cache
            await Promise.all(
                Array.from(uniqueUserIds).map(async (id) => {
                    await this.cacheManager.del(`user:${id}:chats`);
                })
            )

            return updatedChat;
        } catch (error) {
            if (error.code === 'P2025') {
                throw new BadRequestException("One or more users do not exist")
            }
            throw error;
        }
    }

    async joinGroup(userId: string, chatId: string) {
        const existingParticipant = await this.databaseService.participant.findUnique({
            where: {
                userId_chatId: {
                    userId,
                    chatId
                }
            },
            select: {
                id: true,
            }
        });
        if (existingParticipant) throw new ConflictException("Already joined the chat");

        await this.databaseService.participant.create({
            data: {
                userId,
                chatId
            },
            select: {
                id: true,
                user: {
                    select: {
                        id: true,
                        username: true,
                    }
                }
            }
        });

        const socketPaylod = {
            chatId,
            timestamp: new Date(),
        }

        // update UI immediately
        this.chatGatway.server.to(`user_${userId}`).emit("group_joined", socketPaylod);


        // VALIDATE chats cache
        await this.cacheManager.del(`user:${userId}:chats`);

        return {
            success: true,
            message: "Successfully joined the group chat."
        };
    }

    async leaveGroup(userId: string, chatId: string) {
        await this.messageService.verifyMembership(userId, chatId);

        await this.databaseService.participant.delete({
            where: {
                userId_chatId: {
                    userId,
                    chatId,
                }
            },
        });

        const socketPaylod = {
            chatId,
            timestamp: new Date(),
        }

        // update UI immediately
        this.chatGatway.server.to(`user_${userId}`).emit("group_leaved", socketPaylod);

        // invalidate chats cache
        await this.cacheManager.del(`user:${userId}:chats`);

        return {
            success: true,
            message: 'Successfully leaved the chat'
        }
    }
}
