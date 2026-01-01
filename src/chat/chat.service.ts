import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { ChatGateway } from './chat.gateway';
import { NotificationService } from 'src/notification/notification.service';
import { MessageService } from 'src/message/message.service';
import { RedisService } from 'src/redis/redis.service';
import { NotificationType, Prisma } from 'generated/prisma';
import { RequestUser } from 'src/auth/interfaces/request-user.interface';
import { generateDmKey } from 'src/utils/chat.utils';

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
            return this.getFullChat(chatId);
        }

        return this.getPreviewChat(chatId);
    }

    async getFullChat(chatId: string) {
        const cachedKey = `chat:${chatId}`;
        const cached = await this.redisService.get(cachedKey);
        const cachedResult = cached ? JSON.parse(cached) : null;

        if (cachedResult) {
            console.log('Returning chat from cache..', cachedResult);
            return cachedResult;
        }

        const chat = await this.databaseService.chat.findUnique({
            where: {
                id: chatId, //'am i participant?' is already checked at viewChat()
            },
            select: {
                id: true,
                title: true,
                isGroup: true,
                createdAt: true,
                participants: {
                    select: {
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

        if (!chat) throw new NotFoundException('Chat not found');

        const chatData = {
            id: chat.id,
            title: chat.title,
            isGroup: chat.isGroup,
            createdAt: chat.createdAt,
            participants: chat.participants,
            isParticipant: true,
        };

        await this.redisService.set(cachedKey, JSON.stringify(chatData), 300); //5 minutes

        return chatData;
    }

    async getPreviewChat(chatId: string) {
        const chat = await this.databaseService.chat.findUnique({
            where: { id: chatId },
            select: {
                id: true,
                title: true,
                isGroup: true,
                createdAt: true,
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
            id: chat.id,
            title: chat.title,
            isGroup: chat.isGroup,
            createdAt: chat.createdAt,
            participants: [],
            participantsCount: chat._count.participants,
            isParticipant: false,
        };
    }

    async startChat(me: RequestUser, otherUserId: string) {
        if (me.sub === otherUserId) {
            throw new BadRequestException('You cannot chat with yourself');
        }

        const dmKey = generateDmKey(me.sub, otherUserId);

        const chatItemInclude = {
            messages: {
                orderBy: { createdAt: 'desc' },
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
        } as const;

        const result = await this.databaseService.$transaction(async (tx) => {
            const existingChat = await tx.chat.findUnique({
                where: { dmKey },
                include: chatItemInclude,
            });

            if (existingChat) {
                return { chat: existingChat, isNew: false };
            }

            try {
                const newChat = await tx.chat.create({
                    data: {
                        dmKey,
                        isGroup: false,
                        participants: {
                            create: [
                                { userId: me.sub },
                                { userId: otherUserId },
                            ],
                        },
                    },
                    include: chatItemInclude,
                });
                return { chat: newChat, isNew: true };
            } catch (error) {
                // P2002: Unique constraint failed on the field: `dmKey`
                // the chat was created by the other user just now.
                if (error.code === 'P2002') {
                    const retryChat =
                        await this.databaseService.chat.findUnique({
                            where: { dmKey: dmKey },
                            include: {
                                messages: {
                                    orderBy: { createdAt: 'desc' },
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
                        });
                    return { oldChatExists: true, chat: retryChat };
                }
                // P2003: Foreign key failed (User ID doesn't exist)
                if (error.code === 'P2003') {
                    throw new NotFoundException('User not found');
                }
                throw error;
            }
        });

        if (result.isNew) {
            this.runNewChatSideEffects(me, otherUserId, result.chat.id).catch(
                (error) =>
                    console.error(
                        'Background task for starting new chat failed:',
                        error,
                    ),
            );
        }

        return { oldChatExists: !result.isNew, chat: result.chat };
    }

    private async runNewChatSideEffects(
        me: RequestUser,
        otherUserId: string,
        chatId: string,
    ) {
        const promises: Promise<any>[] = [];

        promises.push(
            this.notificationService.createNotification(me.sub, chatId, {
                receiverId: otherUserId,
                type: NotificationType.NEW_CHAT,
            }),
        );

        const socketPayload = {
            chatId,
            user: {
                id: me.sub,
                username: me.username,
            },
        };
        // Broadcast vis WS
        this.chatGateway.server
            .to(`user_${otherUserId}`)
            .emit('new_chat', socketPayload);

        // Invalidate cache
        const keysToDelete = [
            `user:${me.sub}:chats`,
            `user:${otherUserId}:chats`,
        ];
        promises.push(this.redisService.del(...keysToDelete));

        await Promise.all(promises);
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

    async updateChatTitle(me: RequestUser, chatId: string, newTitle: string) {
        const formattedTitle = newTitle.trim() || null;

        const { participants } = await this.databaseService.$transaction(
            async (tx) => {
                const existingChat = await tx.chat.findUnique({
                    where: { id: chatId },
                    include: {
                        participants: {
                            select: {
                                userId: true,
                            },
                        },
                    },
                });

                if (!existingChat)
                    throw new NotFoundException('Chat not found');
                if (!existingChat.isGroup)
                    throw new ForbiddenException(
                        'Direct messages cannot have custom titles',
                    );

                const isMember = existingChat.participants.some(
                    (p) => p.userId === me.sub,
                );

                if (!isMember) {
                    throw new ForbiddenException(
                        'You are not the member of this chat',
                    );
                }

                const result = await tx.chat.update({
                    where: { id: chatId },
                    data: { title: formattedTitle },
                });

                return {
                    participants: existingChat.participants,
                };
            },
        );

        const payload = {
            chatId,
            newTitle: formattedTitle,
            actor: {
                id: me.sub,
                username: me.username,
            },
        };

        const runBackgroundTasks = async () => {
            try {
                const promises: Promise<any>[] = [];

                const keysToDelete = [`chat:${chatId}`];
                participants.forEach((parti) => {
                    keysToDelete.push(`user:${parti.userId}:chats`);
                });

                if (keysToDelete.length > 0) {
                    promises.push(this.redisService.del(...keysToDelete));
                }

                const recepients = participants.filter(
                    (p) => p.userId !== me.sub,
                );
                if (recepients.length > 0) {
                    const nofifyJob = Promise.all(
                        recepients.map(async (parti) =>
                            this.notificationService.createNotification(
                                me.sub,
                                chatId,
                                {
                                    receiverId: parti.userId,
                                    type: NotificationType.TITLE_UPDATED,
                                },
                            ),
                        ),
                    );

                    promises.push(nofifyJob);
                }

                // Broadcast via WS
                this.chatGateway.server
                    .to(`chat_${chatId}`)
                    .emit('title_update', payload);

                await Promise.all(promises);
            } catch (error) {
                console.error(
                    `Background task failed for updating chat tile ${chatId}:`,
                    error,
                );
            }
        };
        runBackgroundTasks(); //fire and forget

        return { chatId, title: formattedTitle };
    }

    async createGroupChat(me: RequestUser, title: string, userIds: string[]) {
        const uniqueUserIds = new Set<string>([...userIds, me.sub]);
        const usersToParticipate = Array.from(uniqueUserIds).map((id) => ({
            userId: id,
        }));

        if (usersToParticipate.length < 2) {
            throw new BadRequestException(
                'A group must have at one other member',
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
                messages: true,
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

        uniqueUserIds.delete(me.sub); //deduct me
        const usersToNotify = Array.from(uniqueUserIds).map(
            (id) => `user_${id}`,
        );

        const runBackgroundTasks = async () => {
            try {
                const promises: Promise<any>[] = [];

                const nofifyJob = Promise.all(
                    Array.from(uniqueUserIds).map((id) => {
                        return this.notificationService.createNotification(
                            me.sub,
                            groupChat.id,
                            {
                                receiverId: id,
                                type: NotificationType.GROUP_ADDED,
                            },
                        );
                    }),
                );

                promises.push(nofifyJob);

                const socketPayload = {
                    chatId: groupChat.id,
                    title: groupChat.title ?? 'New Group',
                    user: {
                        id: me.sub,
                        username: me.username,
                    },
                };

                // Broadcast vis WS
                this.chatGateway.server
                    .to(usersToNotify)
                    .emit('group_added', socketPayload);

                // Invalidate cache
                const keysToDelete: string[] = [];
                Array.from([...uniqueUserIds, me.sub]).forEach((id) =>
                    keysToDelete.push(`user:${id}:chats`),
                );

                promises.push(this.redisService.del(...keysToDelete));

                await Promise.all(promises);
            } catch (error) {
                console.error(
                    'Failed to run backgroun tasks for new group creation',
                    error,
                );
            }
        };

        runBackgroundTasks(); //fire and forgot

        return groupChat;
    }

    async addToGroupChat(me: RequestUser, chatId: string, userIds: string[]) {
        const requestedUserIds = new Set(userIds.filter((id) => id !== me.sub));
        if (requestedUserIds.size === 0) {
            throw new BadRequestException('No valid users to add');
        }

        const { chat, addedUserIds } = await this.databaseService.$transaction(
            async (tx) => {
                const existingChat = await tx.chat.findUnique({
                    where: { id: chatId },
                    select: {
                        id: true,
                        title: true,
                        isGroup: true,
                        participants: {
                            select: { userId: true },
                        },
                    },
                });

                if (!existingChat)
                    throw new NotFoundException('Chat not found');

                // Check if requester is a member
                const isRequesterMember = existingChat.participants.some(
                    (p) => p.userId === me.sub,
                );
                if (!isRequesterMember)
                    throw new ForbiddenException(
                        'You are not a member of this chat',
                    );

                if (!existingChat.isGroup)
                    throw new ForbiddenException(
                        'Cannot add members to a Direct Message. Create a group instead.',
                    );

                //Filter out users who are ALREADY members
                const existingMemberIds = new Set(
                    existingChat.participants.map((p) => p.userId),
                );
                const usersToAdd = Array.from(requestedUserIds).filter(
                    (id) => !existingMemberIds.has(id),
                );

                if (usersToAdd.length === 0) {
                    // If everyone requested is already in the group, just return early
                    return {
                        chat: existingChat,
                        addedUserIds: [],
                    };
                }

                try {
                    await tx.participant.createMany({
                        data: usersToAdd.map((userId) => ({
                            chatId,
                            userId,
                        })),
                        skipDuplicates: true,
                    });
                } catch (error) {
                    // Handle "User does not exist" (Foreign Key Constraint Fails)
                    if (error.code === 'P2003') {
                        // Prisma FK violation code
                        throw new BadRequestException(
                            'One or more user IDs do not exist',
                        );
                    }
                    throw error;
                }

                return {
                    chat: existingChat,
                    addedUserIds: usersToAdd,
                };
            },
        );

        if (addedUserIds.length === 0) {
            return {
                success: true,
                addedMembersCount: 0,
                chatId,
            };
        }

        const runBackgroundTasks = async () => {
            try {
                const promises: Promise<any>[] = [];

                const keysToDelete = [`chat:${chatId}`];
                //old members
                chat.participants.forEach((p) => {
                    keysToDelete.push(`user:${p.userId}:chats`);
                });
                //new members
                addedUserIds.forEach((id) =>
                    keysToDelete.push(`user:${id}:chats`),
                );

                if (keysToDelete.length > 0) {
                    promises.push(this.redisService.del(...keysToDelete));
                }

                //notis only for new users
                const notifyJob = Promise.all(
                    addedUserIds.map((id) =>
                        this.notificationService.createNotification(
                            me.sub,
                            chatId,
                            {
                                receiverId: id,
                                type: NotificationType.GROUP_ADDED,
                            },
                        ),
                    ),
                );
                promises.push(notifyJob);

                const socketPayload = {
                    chatId,
                    title: chat.title ?? 'Group Chat',
                    user: {
                        id: me.sub,
                        username: me.username,
                    },
                };

                // Broadcast via WS
                // old members
                this.chatGateway.server
                    .to(`chat_${chatId}`)
                    .emit('members_added', {
                        ...socketPayload,
                        addedMembersCount: addedUserIds.length,
                    });
                //new members
                const newMemberRooms = addedUserIds.map((id) => `user_${id}`);
                this.chatGateway.server
                    .to(newMemberRooms)
                    .emit('group_added', socketPayload);

                await Promise.all(promises);
            } catch (error) {
                console.error(
                    `Background task failed for adding members to chat: ${chatId}:`,
                    error,
                );
            }
        };

        runBackgroundTasks(); //fire and forget

        return {
            success: true,
            chatId,
            addedMembersCount: addedUserIds.length,
        };
    }
    async inviteToGroupChat(
        me: RequestUser,
        chatId: string,
        userIds: string[],
    ) {
        const requestedUserIds = new Set(userIds.filter((id) => id !== me.sub));
        if (requestedUserIds.size === 0) {
            throw new BadRequestException('No valid users to add');
        }

        const { chat, usersToInvite } = await this.databaseService.$transaction(
            async (tx) => {
                const existingChat = await tx.chat.findUnique({
                    where: { id: chatId },
                    select: {
                        id: true,
                        title: true,
                        isGroup: true,
                        participants: {
                            select: { userId: true },
                        },
                    },
                });

                if (!existingChat)
                    throw new NotFoundException('Chat not found');

                // Check if requester is a member
                const isRequesterMember = existingChat.participants.some(
                    (p) => p.userId === me.sub,
                );
                if (!isRequesterMember)
                    throw new ForbiddenException(
                        'You are not a member of this chat',
                    );

                if (!existingChat.isGroup)
                    throw new ForbiddenException(
                        'Cannot add members to a Direct Message. Create a group instead.',
                    );

                //Filter out users who are ALREADY members
                const existingMemberIds = new Set(
                    existingChat.participants.map((p) => p.userId),
                );
                const usersToInvite = Array.from(requestedUserIds).filter(
                    (id) => !existingMemberIds.has(id),
                );

                if (usersToInvite.length === 0) {
                    // If everyone requested is already in the group, just return early
                    return {
                        chat: existingChat,
                        usersToInvite: [],
                    };
                }

                return {
                    chat: existingChat,
                    usersToInvite,
                };
            },
        );

        if (usersToInvite.length === 0) {
            return {
                success: true,
                invitedMembersCount: 0,
                chatId,
            };
        }

        const runBackgroundTasks = async () => {
            try {
                const socketPayload = {
                    chatId,
                    title: chat.title ?? 'Group Chat',
                    user: {
                        id: me.sub,
                        username: me.username,
                    },
                };

                //new members
                const newMemberRooms = usersToInvite.map((id) => `user_${id}`);
                this.chatGateway.server
                    .to(newMemberRooms)
                    .emit('group_invited', socketPayload);

                await Promise.all(
                    usersToInvite.map((id) =>
                        this.notificationService.createNotification(
                            me.sub,
                            chatId,
                            {
                                receiverId: id,
                                type: NotificationType.GROUP_INVITED,
                            },
                        ),
                    ),
                );
            } catch (error) {
                console.error(
                    `Background task failed for inviting members to chat: ${chatId}:`,
                    error,
                );
            }
        };

        runBackgroundTasks(); //fire and forget

        return {
            success: true,
            chatId,
            invitedMembersCount: usersToInvite.length,
        };
    }

    async joinGroup(me: RequestUser, chatId: string) {
        const { chat, existingParticipant } =
            await this.databaseService.$transaction(async (tx) => {
                const chat = await tx.chat.findUnique({
                    where: { id: chatId },
                    select: {
                        isGroup: true,
                        title: true,
                    },
                });
                const existingParticipant = await tx.participant.findUnique({
                    where: {
                        userId_chatId: {
                            userId: me.sub,
                            chatId,
                        },
                    },
                    select: {
                        id: true,
                    },
                });
                return { chat, existingParticipant };
            });

        if (!chat) throw new NotFoundException('Chat not found');
        if (!chat.isGroup)
            throw new ForbiddenException(
                'You cannot join a direct message chat',
            );
        if (existingParticipant)
            throw new ConflictException('Already joined the chat');

        await this.databaseService.participant.create({
            data: {
                userId: me.sub,
                chatId,
            },
            select: {
                id: true,
            },
        });

        const payload = {
            chatId,
            title: chat.title ?? 'Group Chat',
            user: {
                id: me.sub,
                username: me.username,
            },
        };

        this.chatGateway.server
            .to(`chat_${chatId}`)
            .emit('user_joined_group', payload);

        // validate cache
        const keysToDelete = [`user:${me.sub}:chats`, `chat:${chatId}`];
        this.redisService.del(...keysToDelete);

        return {
            success: true,
            chatId,
        };
    }

    async leaveGroup(me: RequestUser, chatId: string) {
        await this.messageService.verifyMembership(me.sub, chatId);

        const participant = await this.databaseService.participant.delete({
            where: {
                userId_chatId: {
                    userId: me.sub,
                    chatId,
                },
            },
            select: {
                chat: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });

        const payload = {
            chatId,
            title: participant.chat.title ?? 'Group Chat',
            user: {
                id: me.sub,
                username: me.username,
            },
        };

        this.chatGateway.server
            .to(`chat_${chatId}`)
            .emit('user_left_group', payload);

        // invalidate cache
        const keysToDelete = [`user:${me.sub}:chats`, `chat:${chatId}`];
        this.redisService.del(...keysToDelete);

        return {
            success: true,
            chatId,
        };
    }

    async searchUsersToInvite(me: RequestUser, chatId: string, q?: string) {
        const chat = await this.databaseService.chat.findUnique({
            where: { id: chatId },
            select: {
                id: true,
                isGroup: true,
                participants: {
                    select: {
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
        if (!chat) throw new NotFoundException('Chat not found');
        if (!chat.isGroup)
            throw new NotFoundException(
                'You cannot add members to direct chat',
            );

        if (!chat.participants.some((p) => p.user.id === me.sub)) {
            throw new ForbiddenException('You are not a member of this chat');
        }

        const where: Prisma.UserWhereInput = {
            id: {
                notIn: [...chat.participants.map((p) => p.user.id)],
            },
        };

        if (q) {
            where.OR = [
                { username: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
            ];
        }

        const availabeUsers = await this.databaseService.user.findMany({
            where,
            select: {
                id: true,
                username: true,
            },
        });

        return availabeUsers;
    }
}
